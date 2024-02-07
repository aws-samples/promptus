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
import {APIGatewayProxyCognitoAuthorizer, APIGatewayProxyEvent, APIGatewayProxyHandler} from "aws-lambda";
import {v4 as uuidV4} from "uuid";
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";
import {Project, ProjectDto} from "promptusCommon/Entities";

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client)

const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    let authorizer = event.requestContext.authorizer! as APIGatewayProxyCognitoAuthorizer;
    const project = JSON.parse(event.body || '{}') as ProjectDto;
    const projectId = uuidV4()
    project.id = projectId
    if("PUBLIC_PROJECT" == project.publicProject) {
        project.name = project.name + " [" + authorizer.claims["cognito:username"] + "]"
    }
    const command = new PutCommand({
        TableName: process.env.DYNAMO_TABLE,
        Item: {
            'entityId': "#USER" + authorizer.claims["sub"],
            'entityContextId': "#PROJECT#" + projectId,
            'project': project as Project,
            'publicEntity': project.publicProject
        },
    });

    try {
        let clientResponse = await docClient.send(command);
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify(clientResponse.Attributes),
        };
    } catch (error) {
        console.log("Error", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: 'An error occurred while creating the project'
        };
    }
}

export {handler};