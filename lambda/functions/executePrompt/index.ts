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
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, PutCommand, QueryCommand} from "@aws-sdk/lib-dynamodb";
import {PromptCommentEntity, PromptDetailEntity} from "promptusCommon/Entities";
import * as process from "process";
import {BedrockRuntimeClient} from "@aws-sdk/client-bedrock-runtime";
import {AwsUtils} from "/opt/nodejs/AwsUtils";

const bedrockRuntimeClient = new BedrockRuntimeClient();
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client)

const handler: APIGatewayProxyHandler = async (event) => {
    if (!event.pathParameters || !event.pathParameters.projectId || !event.pathParameters.promptId) {
        let errorMessage = "No projectId or promptId provided";
        console.error(errorMessage)
        return AwsUtils.returnError(errorMessage);
    }
    const projectId = event.pathParameters.projectId
    const promptId = event.pathParameters.promptId
    let promptDetailEntity = JSON.parse(event.body!) as PromptDetailEntity
    let authorizer = event.requestContext.authorizer! as APIGatewayProxyCognitoAuthorizer;

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

    try {
        const answeredPromptDetail = await AwsUtils.executePrompt(bedrockRuntimeClient, promptDetailEntity.promptDetail)
        answeredPromptDetail.date = new Date().toString()
        const latestPromptDetail = await docClient.send(getLatestPromptDetailQueryCommand)
        let newVersion = 1
        if (latestPromptDetail.Count && latestPromptDetail.Count > 0) {
            const promptDetailEntity = latestPromptDetail.Items![0] as PromptDetailEntity
            const latestVersion = promptDetailEntity.version
            newVersion = latestVersion + 1
        }
        const promptDetailPutCommand = new PutCommand({
            TableName: process.env.DYNAMO_TABLE,
            Item: {
                'entityId': "#PROJECT#" + projectId + "#PROMPTDETAIL#" + promptId,
                'entityContextId': "" + newVersion,
                'promptDetail': answeredPromptDetail,
                'version': newVersion
            },
        });
        await docClient.send(promptDetailPutCommand)
        return AwsUtils.addSystemComment(docClient, {
            entityId: promptDetailEntity.entityId,
            entityContextId: promptDetailEntity.entityContextId,
            promptComment: {
                message: authorizer.claims["cognito:username"] + " created version " + newVersion + " by executing prompt.",
                version: newVersion,
                user: "SYSTEM",
                date: new Date().toString()
            }
        } as PromptCommentEntity)
    } catch (error) {
        console.error("Error executing prompt", error);
        if (error instanceof Error) {
            return AwsUtils.returnError(error.message);
        } else {
            return AwsUtils.returnError("There was an error executing the prompt");
        }
    }
};
export {handler};
