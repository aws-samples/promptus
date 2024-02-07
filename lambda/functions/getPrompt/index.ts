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

import {DynamoDBClient, Select} from "@aws-sdk/client-dynamodb";
import {APIGatewayProxyCognitoAuthorizer, APIGatewayProxyHandler} from "aws-lambda";
import {DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb";
import {Model, PromptDetailDto, PromptDetailEntity, PromptEntity} from "promptusCommon/Entities";
import {BedrockClient, ListFoundationModelsCommand} from "@aws-sdk/client-bedrock"
import * as process from "process";

const bedrockClient = new BedrockClient({region: "us-east-1"});
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client)

const blockedModels = ["amazon.titan-embed-text-v1", "amazon.titan-embed-g1-text-02", "amazon.titan-image-generator-v1", "meta.llama2-13b-v1", "meta.llama2-70b-v1"] as string[]

async function getAvailableModels() {
    const response = await bedrockClient.send(new ListFoundationModelsCommand({}))
    let models = [] as Model[];
    response.modelSummaries?.forEach(value => {
        if (!value.modelId?.includes(":") && (value.modelId?.startsWith("anthropic") || value.modelId?.startsWith("meta") || value.modelId?.startsWith("ai21") || value.modelId?.startsWith("amazon"))) {
            if (!blockedModels.includes(value.modelId)) {
                models.push({modelId: value.modelId!, modelName: value.modelName!})
            }
        }
    })
    return models
}

const handler: APIGatewayProxyHandler = async (event) => {
    function returnError() {
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: 'An error occurred while reading the prompts'
        };
    }

    function returnForbidden() {
        return {
            statusCode: 401,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: "You're trying to access a private prompt"
        };
    }

    if (!event.pathParameters || !event.pathParameters.projectId || !event.pathParameters.promptId) {
        console.error("No projectId or promptId provided")
        return returnError();
    }
    const projectId = event.pathParameters.projectId
    const promptId = event.pathParameters.promptId
    let authorizer = event.requestContext.authorizer! as APIGatewayProxyCognitoAuthorizer;

    const getPromptDetailsQueryCommand = new QueryCommand({
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "#entityId = :entityId",
        ExpressionAttributeNames: {
            "#entityId": "entityId",
        },
        ExpressionAttributeValues: {
            ":entityId": "#PROJECT#" + projectId + "#PROMPTDETAIL#" + promptId
        },
        ScanIndexForward: false,
        IndexName: "promptDetailVersionIndex"

    })
    const getPrivatePromptQueryCommand = new QueryCommand({
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "#entityId = :entityId and #entityContextId = :entityContextId",
        ExpressionAttributeNames: {
            "#entityId": "entityId",
            "#entityContextId": "entityContextId",
        },
        ExpressionAttributeValues: {
            ":entityId": "#USER" + authorizer.claims["sub"] + "#PROJECT" + projectId,
            ":entityContextId": "#PROJECT" + projectId + "#PROMPT" + promptId
        },
    })
    const getPublicPromptQueryCommand = new QueryCommand({
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "#publicEntity = :publicPrompt and #entityContextId = :entityContextId",
        ExpressionAttributeNames: {
            "#publicEntity": "publicEntity",
            "#entityContextId": "entityContextId",
        },
        ExpressionAttributeValues: {
            ":publicPrompt": "PUBLIC_PROMPT",
            ":entityContextId": "#PROJECT" + projectId + "#PROMPT" + promptId
        },
        IndexName: "publicEntityContextIndex",
        Select: Select.ALL_PROJECTED_ATTRIBUTES
    })
    try {
        let promptResponse = await docClient.send(getPublicPromptQueryCommand);
        if (promptResponse.Count == 0) {
            promptResponse = await docClient.send(getPrivatePromptQueryCommand);
            if (promptResponse.Count == 0) {
                return returnForbidden()
            }
        }
        const [promptDetailsResponse, availableModels] = await Promise.all([docClient.send(getPromptDetailsQueryCommand),getAvailableModels()])
        let promptDetailDto = {} as PromptDetailDto
        promptDetailDto.promptEntity = promptResponse.Items![0] as PromptEntity
        promptDetailDto.promptDetailEntity = promptDetailsResponse.Items as PromptDetailEntity[]
        promptDetailDto.models = availableModels
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify(promptDetailDto)
        };
    } catch (error) {
        console.log("Error", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: 'An error occurred while reading the projects'
        };
    }
};
export {handler};
