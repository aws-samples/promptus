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

import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {APIGatewayProxyCognitoAuthorizer, APIGatewayProxyHandler} from "aws-lambda";
import {v4 as uuidV4} from "uuid";
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";
import {Prompt, PromptCommentEntity, PromptDto} from "promptusCommon/Entities";
import {AwsUtils} from "/opt/nodejs/AwsUtils";

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
            body: 'An error occurred while creating the prompt'
        };
    }

    let authorizer = event.requestContext.authorizer! as APIGatewayProxyCognitoAuthorizer;
    const prompt = JSON.parse(event.body || '{}') as PromptDto;
    if (!event.queryStringParameters || !event.queryStringParameters.projectId) {
        console.error("No projectId provided")
        return returnError();
    }
    const projectId = event.queryStringParameters.projectId
    const promptId = uuidV4()
    prompt.id = promptId
    let entityId = "#USER" + authorizer.claims["sub"] + "#PROJECT" + projectId;
    let entityContextId = "#PROJECT" + projectId + "#PROMPT" + promptId;
    const promptPutCommand = new PutCommand({
        TableName: process.env.DYNAMO_TABLE,
        Item: {
            'entityId': entityId,
            'entityContextId': entityContextId,
            'prompt': prompt as Prompt,
            'publicEntity': prompt.publicPrompt,
            'comments' : []
        },
    });
    try {
        await docClient.send(promptPutCommand);
        return await AwsUtils.addSystemComment(docClient, {
            entityId: entityId,
            entityContextId: entityId,
            promptComment: {
                user: "SYSTEM",
                date: new Date().toISOString(),
                message: "Prompt created by user " + authorizer.claims["cognito:username"] + ".",
                version: 0
            }
        } as PromptCommentEntity)
    } catch (error) {
        console.log("Error", error);
        return returnError();
    }
}

export {handler};