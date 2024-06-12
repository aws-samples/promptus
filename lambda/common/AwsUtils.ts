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

import * as console from "console";
import {DynamoDBDocumentClient, UpdateCommand} from "@aws-sdk/lib-dynamodb";
import {
    Ai21InferenceEntity,
    AnthropicInferenceEntity,
    MetaInferenceEntity,
    MistralInferenceEntity,
    PromptCommentEntity,
    PromptDetail,
    StabilityInferenceEntity,
    TitanImageInferenceEntity,
    TitanInferenceEntity
} from "promptusCommon/Entities";
import {APIGatewayProxyCognitoAuthorizer} from "aws-lambda";
import {BedrockRuntimeClient, InvokeModelCommand} from "@aws-sdk/client-bedrock-runtime";
import {PutObjectCommand, PutObjectCommandOutput, S3Client} from "@aws-sdk/client-s3";
import process from "process";
import {v4 as uuidV4} from "uuid"

const s3Client = new S3Client()

export class AwsUtils {

    static async addSystemComment(docClient: DynamoDBDocumentClient, comment: PromptCommentEntity) {
        return await AwsUtils.addCommentInternal(docClient, comment)
    }

    static async addComment(docClient: DynamoDBDocumentClient, authorizer: APIGatewayProxyCognitoAuthorizer, comment: PromptCommentEntity) {
        comment.promptComment.user = authorizer.claims["cognito:username"]
        return await AwsUtils.addCommentInternal(docClient, comment)
    }

    private static async addCommentInternal(docClient: DynamoDBDocumentClient, comment: PromptCommentEntity) {
        comment.promptComment.date = new Date().toISOString()
        const commentUpdateCommand = new UpdateCommand({
            TableName: process.env.DYNAMO_TABLE,
            Key: {
                'entityId': comment.entityId,
                'entityContextId': comment.entityContextId
            },
            UpdateExpression: "set #comments = list_append(:comment, #comments)",
            ExpressionAttributeNames: {
                "#comments": "comments"
            },
            ExpressionAttributeValues: {
                ":comment": [comment.promptComment]
            }
        })
        try {
            await docClient.send(commentUpdateCommand);
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                body: "",
            };
        } catch (error) {
            console.log("Error", error);
            return AwsUtils.returnError("An unexpected error occurred while saving your comment.");
        }
    }

    static returnError(errorMessage: string) {
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: errorMessage
        };
    }

    private static async invokeBedrockAndExtractResponse(bedrockRuntimeClient: BedrockRuntimeClient, promptDetail: PromptDetail, inference: any, answerField: string) {
        await AwsUtils.invokeBedrock(bedrockRuntimeClient, promptDetail, inference, response => {
            return JSON.parse(response)[answerField]
        });
    }

    private static async invokeBedrock(bedrockRuntimeClient: BedrockRuntimeClient, promptDetail: PromptDetail, inference: any, responseExtractor: (response: string) => string) {
        let invokeModelCommand = new InvokeModelCommand({
            modelId: promptDetail.modelUsed,
            body: JSON.stringify(inference),
            accept: "application/json",
            contentType: "application/json"
        });
        console.log("Inference:" + JSON.stringify(invokeModelCommand))
        let bedrockResponse = await bedrockRuntimeClient.send(invokeModelCommand)
        promptDetail.answerRaw = bedrockResponse.body.transformToString()
        promptDetail.answerParsed = responseExtractor(promptDetail.answerRaw)
    }

    private static async invokeBedrockForImage(bedrockRuntimeClient: BedrockRuntimeClient, promptDetail: PromptDetail, inference: any, responseExtractor: (response: string) => Promise<string>, rawResponseExtractor: (response: string) => string) {
        let invokeModelCommand = new InvokeModelCommand({
            modelId: promptDetail.modelUsed,
            body: JSON.stringify(inference),
            accept: "application/json",
            contentType: "application/json"
        });
        console.log("Inference:" + JSON.stringify(invokeModelCommand))
        let bedrockResponse = await bedrockRuntimeClient.send(invokeModelCommand)
        promptDetail.answerRaw = rawResponseExtractor(bedrockResponse.body.transformToString())
        promptDetail.answerParsed = await responseExtractor(bedrockResponse.body.transformToString())
        promptDetail.isImage = true
    }

    static async executePrompt(bedrockRuntimeClient: BedrockRuntimeClient, promptDetail: PromptDetail) {
        if (promptDetail.modelUsed?.startsWith("anthropic.")) {
            await AwsUtils.invokeBedrock(bedrockRuntimeClient, promptDetail, promptDetail.inference as AnthropicInferenceEntity, response => {
                return JSON.parse(response)["content"][0]["text"]
            })
        } else if (promptDetail.modelUsed?.startsWith("meta")) {
            await AwsUtils.invokeBedrockAndExtractResponse(bedrockRuntimeClient, promptDetail, promptDetail.inference as MetaInferenceEntity, "generation")
        } else if (promptDetail.modelUsed?.startsWith("ai21")) {
            await AwsUtils.invokeBedrock(bedrockRuntimeClient, promptDetail, promptDetail.inference as Ai21InferenceEntity, response => {
                return JSON.parse(response)["completions"][0]["data"]["text"]
            })
        } else if (promptDetail.modelUsed?.startsWith("amazon")) {
            if (promptDetail.modelUsed?.includes("image")) {
                let inference = promptDetail.inference as TitanImageInferenceEntity
                if (inference.textToImageParams.negativeText === "") {
                    inference.textToImageParams.negativeText = undefined
                }
                await AwsUtils.invokeBedrockForImage(bedrockRuntimeClient, promptDetail, inference, async response => {
                    const bedrockResponseBody = JSON.parse(response) as {
                        images: string[]
                    }
                    const generatedImageKeys = [] as string[]
                    const promises = [] as Promise<PutObjectCommandOutput>[]
                    bedrockResponseBody.images.forEach(image => {
                        const imageKey = "generatedImages/" + uuidV4() + ".jpg";
                        generatedImageKeys.push(imageKey)
                        promises.push(s3Client.send(new PutObjectCommand(
                            {
                                Bucket: process.env.BUCKET,
                                Key: imageKey,
                                Body: Buffer.from(image, "base64")
                            }
                        )))
                    })
                    await Promise.all(promises)
                    return generatedImageKeys.join("#")
                }, response => {
                    const bedrockResponseBody = JSON.parse(response) as {
                        images: string[],
                        error: string
                    }
                    for (let i = 0; i < bedrockResponseBody.images.length; i++) {
                        bedrockResponseBody.images[i] = ""
                    }
                    return JSON.stringify(bedrockResponseBody)
                })
            } else {
                await AwsUtils.invokeBedrock(bedrockRuntimeClient, promptDetail, promptDetail.inference as TitanInferenceEntity, response => {
                    return JSON.parse(response)["results"][0]["outputText"]
                })
            }
        } else if (promptDetail.modelUsed?.startsWith("mistral")) {
            let mistralInference = promptDetail.inference as MistralInferenceEntity;
            await AwsUtils.invokeBedrock(bedrockRuntimeClient, promptDetail, mistralInference, response => {
                return JSON.parse(response)["outputs"][0]["text"]
            })
        } else if (promptDetail.modelUsed?.startsWith("stability")) {
            let inference = promptDetail.inference as StabilityInferenceEntity;
            await AwsUtils.invokeBedrockForImage(bedrockRuntimeClient, promptDetail, inference, async response => {
                const bedrockResponseBody = JSON.parse(response) as {
                    result: string,
                    artifacts: {
                        seed: number
                        base64: string
                        finishReason: string
                    }[]
                }
                const generatedImageKeys = [] as string[]
                const promises = [] as Promise<PutObjectCommandOutput>[]
                bedrockResponseBody.artifacts.forEach(artfifact => {
                    const imageKey = "generatedImages/" + uuidV4() + ".jpg";
                    generatedImageKeys.push(imageKey)
                    promises.push(s3Client.send(new PutObjectCommand(
                        {
                            Bucket: process.env.BUCKET,
                            Key: imageKey,
                            Body: Buffer.from(artfifact.base64, "base64")
                        }
                    )))
                })
                await Promise.all(promises)
                return generatedImageKeys.join("#")
            }, response => {
                const bedrockResponseBody = JSON.parse(response) as {
                    result: string,
                    artifacts: {
                        seed: number
                        base64: string
                        finishReason: string
                    }[]
                }
                for (let i = 0; i < bedrockResponseBody.artifacts.length; i++) {
                    bedrockResponseBody.artifacts[i].base64 = ""
                }
                return JSON.stringify(bedrockResponseBody)
            })
        } else {
            console.error("Not able to handle model " + promptDetail.modelUsed)
            throw new Error("The model " + promptDetail.modelUsed + " is currently not supported in Promptus")
        }
        return promptDetail

    }

    static returnForbidden() {
        return {
            statusCode: 401,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: "You're trying to access a private prompt"
        };
    }

}
