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
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb";
import {PromptCommentEntity} from "/opt/nodejs/Entities";
import {AwsUtils} from "/opt/nodejs/AwsUtils";

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client)

const handler: APIGatewayProxyHandler = async (event) => {
    let authorizer = event.requestContext.authorizer! as APIGatewayProxyCognitoAuthorizer;
    let comment = JSON.parse(event.body!) as PromptCommentEntity
    return await AwsUtils.addComment(docClient, authorizer, comment);
}

export {handler};