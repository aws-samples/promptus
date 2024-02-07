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
import {PromptEntity} from "/opt/nodejs/Entities";

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client)

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

    if (!event.queryStringParameters || !event.queryStringParameters.projectId) {
        console.error("No projectId provided")
        return returnError();
    }
    const projectId = event.queryStringParameters.projectId
    let authorizer = event.requestContext.authorizer! as APIGatewayProxyCognitoAuthorizer;
    const queryPublicPromptsCommand = new QueryCommand({
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "#publicEntity = :publicPrompt and begins_with(#entityContextId, :projectPrompt)",
        ExpressionAttributeNames: {
            "#publicEntity": "publicEntity",
            "#entityContextId": "entityContextId"
        },
        ExpressionAttributeValues: {
            ":publicPrompt": "PUBLIC_PROMPT",
            ":projectPrompt": "#PROJECT" + projectId + "#PROMPT"
        },
        IndexName: "publicEntityContextIndex",
        Select: Select.ALL_PROJECTED_ATTRIBUTES
    })
    const queryUserPromptsCommand = new QueryCommand({
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "#publicEntity = :publicPrompt and #entityId = :userProject",
        ExpressionAttributeNames: {
            "#entityId": "entityId",
            "#publicEntity": "publicEntity"
        },
        ExpressionAttributeValues: {
            ":userProject": "#USER" + authorizer.claims["sub"] + "#PROJECT" + projectId,
            ":publicPrompt": " ",
        },
        IndexName: "publicEntityIndex",
        Select: Select.ALL_PROJECTED_ATTRIBUTES
    })
    try {
        const [publicPrompts, userPrompts] = await Promise.all([docClient.send(queryPublicPromptsCommand), docClient.send(queryUserPromptsCommand)])
        const promptEntityList = [] as PromptEntity[]
        promptEntityList.push(...publicPrompts.Items as PromptEntity[])
        promptEntityList.push(...userPrompts.Items as PromptEntity[])
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify(promptEntityList)
        };
    } catch (error) {
        console.log("Error", error);
        return returnError();
    }
};
export {handler};
