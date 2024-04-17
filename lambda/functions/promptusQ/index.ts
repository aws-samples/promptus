/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 *  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {APIGatewayProxyCognitoAuthorizer, APIGatewayProxyHandler} from "aws-lambda";
import {
    AnthropicInferenceEntity,
    PromptCommentEntity,
    PromptDetailEntity,
    PromptusQDto,
    PromptusQEntity
} from "promptusCommon/Entities";
import {BedrockRuntimeClient} from "@aws-sdk/client-bedrock-runtime";
import {AwsUtils} from "/opt/nodejs/AwsUtils";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb";
import process from "process";

const bedrockRuntimeClient = new BedrockRuntimeClient();
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client)

const promptusAiPrompt = `Human: You're a prompt engineer with a massive amount of experience in designing most effective prompts for large language models. I try to solve my challenge using the <current_prompt>##CURRENT_PROMPT##</current_prompt>. What I want to achieve is <prompt_description>##PROMPT_DESCRIPTION##</prompt_description>.

Please help me in formulating the most efficient prompt to solve my challenge. You should not answer the question but only formulate the most efficient prompt inside the <promptusQ></promptusQ> tags. The model which will be used to execute the prompt is going to be ##MODEL##.
Assistant:`

async function getCurrentVersion(projectId: string, promptId: string) {
    const getLatestPromptDetailQueryCommand = new QueryCommand({
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "#entityId = :entityId",
        ExpressionAttributeNames: {
            "#entityId": "entityId",
        },
        ExpressionAttributeValues: {
            ":entityId": "#PROJECT#" + projectId + "#PROMPTDETAIL#" + promptId
        },
        Limit: 1,
        ScanIndexForward: false,
        IndexName: "promptDetailVersionIndex"

    })
    const latestPromptDetail = await docClient.send(getLatestPromptDetailQueryCommand)
    let currentVersion = 0
    if (latestPromptDetail.Count && latestPromptDetail.Count > 0) {
        const promptDetailEntity = latestPromptDetail.Items![0] as PromptDetailEntity
        currentVersion = promptDetailEntity.version
    }
    return currentVersion;
}

async function invokePromptusQ(promputsAiEntity: PromptusQEntity) {
    let promptInput = {
        modelUsed: "anthropic.claude-3-sonnet-20240229-v1:0",
        inference: {
            anthropic_version: "bedrock-2023-05-31",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: promptusAiPrompt.replace("##CURRENT_PROMPT##", promputsAiEntity.currentPrompt).replace("##PROMPT_DESCRIPTION##", promputsAiEntity.promptDescription).replace("##MODEL##", promputsAiEntity.model)
                        }
                    ]
                }
            ],
            max_tokens: 8192,
        } as AnthropicInferenceEntity
    };
    const promptDetail = await AwsUtils.executePrompt(bedrockRuntimeClient, promptInput)
    const match = promptDetail.answerParsed!.match(/<promptusQ>([^<]*)<\/promptusQ>/)
    let textBetweenTags = ""
    if (match) {
        textBetweenTags = match[1];
    }
    const promptusQ = (promptDetail as PromptusQDto)
    promptusQ.extractedText = textBetweenTags
    return promptusQ;
}

const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.pathParameters || !event.pathParameters.projectId || !event.pathParameters.promptId) {
            let errorMessage = "No projectId or promptId provided";
            console.error(errorMessage)
            return AwsUtils.returnError(errorMessage);
        }
        const projectId = event.pathParameters.projectId
        const promptId = event.pathParameters.promptId
        const promputsAiEntity = JSON.parse(event.body!) as PromptusQEntity
        let promptusQ = await invokePromptusQ(promputsAiEntity);
        let currentVersion = await getCurrentVersion(projectId, promptId);
        let authorizer = event.requestContext.authorizer! as APIGatewayProxyCognitoAuthorizer;
        await AwsUtils.addSystemComment(docClient, {
            entityId: promputsAiEntity.entityId,
            entityContextId: promputsAiEntity.entityContextId,
            promptComment: {
                title: authorizer.claims["cognito:username"] + " used Promptus Q to optimise prompt.",
                message: "Resulting prompt:\n" + promptusQ.extractedText,
                version: currentVersion,
                user: "PROMPTUSQ",
                date: new Date().toString()
            }
        } as PromptCommentEntity)
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify(promptusQ),
        };
    } catch (error) {
        console.error("Error optimizing prompt", error);
        if (error instanceof Error) {
            return AwsUtils.returnError(error.message);
        } else {
            return AwsUtils.returnError("There was an error optimizing the prompt");
        }
    }
};
export {handler};
