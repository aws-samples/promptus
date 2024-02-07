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
import {BatchWriteCommand, DeleteCommand, DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb";
import * as process from "process";
import {AwsUtils} from "/opt/nodejs/AwsUtils";
import {PromptEntity} from "/opt/nodejs/Entities";

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client)

async function batchDelete(tableName: string, deleteRequests: {
    DeleteRequest: {
        Key: {}
    }
}[]) {
    for (let i = 0; i < deleteRequests.length; i += 25) {
        console.log("Deleting batch " + i)
        const batch = deleteRequests.slice(i, i + 25);
        const params = {
            RequestItems: {
                [tableName]: batch
            }
        };
        try {
            const result = await docClient.send(new BatchWriteCommand(params));
            if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
                console.warn("Not able to delete all items:")
                console.warn(result.UnprocessedItems)
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error("Error performing batch delete: " + error?.message)
            } else {
                throw new Error("Error performing delete.")
            }

        }
    }
}

const handler: APIGatewayProxyHandler = async (event) => {
    if (!event.pathParameters || !event.pathParameters.projectId || !event.pathParameters.promptId) {
        console.error("No projectId or promptId provided")
        return AwsUtils.returnError("No projectId or promptId provided");
    }
    const projectId = event.pathParameters.projectId
    const promptId = event.pathParameters.promptId
    let authorizer = event.requestContext.authorizer! as APIGatewayProxyCognitoAuthorizer;

    const deletePromptCommand = new DeleteCommand({
        TableName: process.env.DYNAMO_TABLE,
        Key: {
            "entityId": "#USER" + authorizer.claims["sub"] + "#PROJECT" + projectId,
            "entityContextId": "#PROJECT" + projectId + "#PROMPT" + promptId
        },
        ReturnValues:"ALL_OLD"
    });

    const queryPromptDetails = new QueryCommand({
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "entityId = :entityId",
        ExpressionAttributeValues: {
            ":entityId": "#PROJECT#" + projectId + "#PROMPTDETAIL#" + promptId
        }
    })
    try {
        let deletePromptResponse = await docClient.send(deletePromptCommand);
        console.log(deletePromptResponse)
        if(!deletePromptResponse.Attributes || !deletePromptResponse.Attributes.entityContextId){
            console.log("No prompt deleted. Skipping here.")
            return AwsUtils.returnError("Error deleting prompt")
        }
        console.log(queryPromptDetails)
        let queryPromptDetailsResponse = await docClient.send(queryPromptDetails);
        const items = queryPromptDetailsResponse.Items as PromptEntity[]
        let deletePromptDetailCommandList = [] as {
            DeleteRequest: {
                Key: {}
            }
        }[]
        console.log(queryPromptDetailsResponse)
        items.forEach((item) => {
            deletePromptDetailCommandList.push({
                DeleteRequest: {
                    Key: {
                        entityId: "#PROJECT#" + projectId + "#PROMPTDETAIL#" + promptId,
                        entityContextId: item.entityContextId
                    }
                }
            })
        })
        console.log("Got " + deletePromptDetailCommandList.length + " prompt details to delete:")
        console.log(JSON.stringify(deletePromptDetailCommandList))
        await batchDelete(process.env.DYNAMO_TABLE!, deletePromptDetailCommandList)
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify("")
        };
    } catch
        (error) {
        console.log("Error", error);
        return AwsUtils.returnError("Error deleting prompt")
    }
};

export {handler};
