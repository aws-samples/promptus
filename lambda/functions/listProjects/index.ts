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
    let authorizer = event.requestContext.authorizer! as APIGatewayProxyCognitoAuthorizer;
    const queryPublicProjectsCommand = new QueryCommand({
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "#publicEntity = :publicProject and begins_with(#entityContextId, :project)",
        ExpressionAttributeNames: {
            "#publicEntity": "publicEntity",
            "#entityContextId": "entityContextId"
        },
        ExpressionAttributeValues: {
            ":publicProject": "PUBLIC_PROJECT",
            ":project": "#PROJECT",
        },
        IndexName: "publicEntityContextIndex",
        Select: Select.ALL_PROJECTED_ATTRIBUTES
    })
    const queryUserProjectsCommand = new QueryCommand({
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "#publicEntity = :publicProject and #entityId = :user",
        ExpressionAttributeNames: {
            "#entityId": "entityId",
            "#publicEntity": "publicEntity"
        },
        ExpressionAttributeValues: {
            ":user": "#USER" + authorizer.claims["sub"],
            ":publicProject": " ",
        },
        IndexName: "publicEntityIndex",
        Select: Select.ALL_PROJECTED_ATTRIBUTES
    })
    try {
        const projectEntityList = [] as PromptEntity[]
        const [publicProjects, userProjects] = await Promise.all([docClient.send(queryPublicProjectsCommand), docClient.send(queryUserProjectsCommand)]);
        projectEntityList.push(...publicProjects.Items as PromptEntity[])
        projectEntityList.push(...userProjects.Items as PromptEntity[])
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify(projectEntityList)
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
