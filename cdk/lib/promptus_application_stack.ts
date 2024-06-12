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

import * as cdk from "aws-cdk-lib";
import {CfnOutput, Duration, RemovalPolicy} from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as agw from "aws-cdk-lib/aws-apigateway";
import {
    AccessLogFormat,
    IResource,
    LogGroupLogDestination,
    MethodLoggingLevel,
    RestApi
} from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import {Table} from "aws-cdk-lib/aws-dynamodb"
import {Construct} from "constructs";
import {ManagedPolicy} from "aws-cdk-lib/aws-iam";
import {AssetCode, LayerVersion, Runtime} from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import {Bucket, IBucket} from "aws-cdk-lib/aws-s3";
import * as path from "path";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import {SecurityPolicyProtocol, SSLMethod} from "aws-cdk-lib/aws-cloudfront"
import * as origins from "aws-cdk-lib/aws-cloudfront-origins"
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import {Certificate} from "aws-cdk-lib/aws-certificatemanager";
import {createApiLambda} from "./serverlessUtils";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import {NagSuppressions} from "cdk-nag";
import {LogGroup} from "aws-cdk-lib/aws-logs";

interface ApplicationProps extends cdk.StackProps {
    userPool: cognito.UserPool,
    certificate?: acm.Certificate
}

export class PromptusApplicationStack extends cdk.Stack {
    public readonly authorizer: agw.CognitoUserPoolsAuthorizer
    private promptusDynamoTable: Table;

    constructor(scope: Construct, id: string, props: ApplicationProps) {
        super(scope, id, props)
        this.addStackSuppresions();
        this.authorizer = new agw.CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
            cognitoUserPools: [props.userPool],
        });
        let layer = this.createLambdaLayer()
        this.createDynamoDbTable()
        let bucket = this.createStaticResourcesBucket()
        let restApi = this.createRestApi(layer, bucket)
        let cloudFrontWebDistribution = this.createCloudFrontDistribution(bucket, restApi, props.certificate)
        if (this.node.tryGetContext('USE_CUSTOM_DOMAIN') === "true") {
            let hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
                hostedZoneId: this.node.tryGetContext('HOSTED_ZONE_ID'),
                zoneName: this.node.tryGetContext('HOSTED_ZONE_NAME')
            })
            new route53.ARecord(this, "AliasRecord", {
                zone: hostedZone,
                target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudFrontWebDistribution)),
                recordName: this.node.tryGetContext('DOMAIN')
            })
        }

        new CfnOutput(this, 'cloudFrontDistributionDomainName', {
            value: cloudFrontWebDistribution.domainName,
            description: "Domainname of the CloudFront distribution"
        })
        new CfnOutput(this, 'staticBucketName', {
            value: bucket.bucketName,
            description: "Name of the bucket which should hold the static frontend resources"
        })
        this.addResourceSuppressionsByPath();
    }

    private addStackSuppresions() {
        NagSuppressions.addStackSuppressions(this, [
            {
                id: 'AwsSolutions-IAM4',
                appliesTo: ["Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"],
                reason: 'Using AmazonAPIGatewayPushToCloudWatchLogs for API Gateway CloudWatch logs.'
            }, {
                id: 'AwsSolutions-IAM4',
                appliesTo: ["Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],
                reason: 'Using AWSLambdaBasicExecutionRole for Lambda execution.'
            }, {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::<promptusDataC67F692A.Arn>/index/*"],
                reason: 'Using addGrantWrite/Read for Lambda access to DynamoDB. Automatically added for Index usage.'
            }, {
                id: 'AwsSolutions-IAM4',
                appliesTo: ["Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonBedrockFullAccess"],
                reason: 'Application needs full access to Amazon Bedrock.'
            }, {
                id: 'AwsSolutions-APIG2',
                reason: 'Request validation not activated for REST API.'
            },
            {
                id: 'AwsSolutions-CFR4',
                reason: 'Using default CloudFront viewer certificate.',
            }
        ])
    }

    private addResourceSuppressionsByPath() {
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/CloudFrontDistribution/LoggingBucket/Resource", [
            {
                id: "AwsSolutions-S1",
                reason: "Using default CDK created CloudFront logging bucket."
            }, {
                id: "AwsSolutions-S10",
                reason: "Using default CDK created CloudFront logging bucket."
            }
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/createProject/ServiceRole/DefaultPolicy/Resource", [
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::*"],
                reason: 'Using standard construct for creating a Function in CDK. This adds a DefaultPolicy which includes Resource::*.'
            }
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/getPrompt/ServiceRole/DefaultPolicy/Resource", [
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::*"],
                reason: 'Using standard construct for creating a Function in CDK. This adds a DefaultPolicy which includes Resource::*.'
            }
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/deletePrompt/ServiceRole/DefaultPolicy/Resource", [
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::*"],
                reason: 'Using standard construct for creating a Function in CDK. This adds a DefaultPolicy which includes Resource::*.'
            }
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/addComment/ServiceRole/DefaultPolicy/Resource", [
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::*"],
                reason: 'Using standard construct for creating a Function in CDK. This adds a DefaultPolicy which includes Resource::*.'
            }
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/executePrompt/ServiceRole/DefaultPolicy/Resource", [
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::*"],
                reason: 'Using standard construct for creating a Function in CDK. This adds a DefaultPolicy which includes Resource::*.'
            },
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Action::s3:Abort*"],
                reason: 'Using standard construct for giving S3 Put permission to a Function in CDK.'
            },
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::<staticBucket49CE0992.Arn>/*"],
                reason: 'Using standard construct for giving S3 Put permission to a Function in CDK.'
            },
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/promptusQ/ServiceRole/DefaultPolicy/Resource", [
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::*"],
                reason: 'Using standard construct for creating a Function in CDK. This adds a DefaultPolicy which includes Resource::*.'
            }
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/createPrompt/ServiceRole/DefaultPolicy/Resource", [
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::*"],
                reason: 'Using standard construct for creating a Function in CDK. This adds a DefaultPolicy which includes Resource::*.'
            }
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/listPrompts/ServiceRole/DefaultPolicy/Resource", [
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::*"],
                reason: 'Using standard construct for creating a Function in CDK. This adds a DefaultPolicy which includes Resource::*.'
            }
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/listProjects/ServiceRole/DefaultPolicy/Resource", [
            {
                id: 'AwsSolutions-IAM5',
                appliesTo: ["Resource::*"],
                reason: 'Using standard construct for creating a Function in CDK. This adds a DefaultPolicy which includes Resource::*.'
            }
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/promptusRestApi/Default/OPTIONS/Resource", [
            {
                id: "AwsSolutions-APIG4",
                reason: "OPTIONS call for CORS support"
            }, {
                id: "AwsSolutions-COG4",
                reason: "OPTIONS call for CORS support"
            },
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/promptusRestApi/Default/api/OPTIONS/Resource", [
            {
                id: "AwsSolutions-APIG4",
                reason: "OPTIONS call for CORS support"
            }, {
                id: "AwsSolutions-COG4",
                reason: "OPTIONS call for CORS support"
            },
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/promptusRestApi/Default/api/project/OPTIONS/Resource", [
            {
                id: "AwsSolutions-APIG4",
                reason: "OPTIONS call for CORS support"
            }, {
                id: "AwsSolutions-COG4",
                reason: "OPTIONS call for CORS support"
            },
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/promptusRestApi/Default/api/project/{projectId}/OPTIONS/Resource", [
            {
                id: "AwsSolutions-APIG4",
                reason: "OPTIONS call for CORS support"
            }, {
                id: "AwsSolutions-COG4",
                reason: "OPTIONS call for CORS support"
            },
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/promptusRestApi/Default/api/project/{projectId}/prompt/OPTIONS/Resource", [
            {
                id: "AwsSolutions-APIG4",
                reason: "OPTIONS call for CORS support"
            }, {
                id: "AwsSolutions-COG4",
                reason: "OPTIONS call for CORS support"
            },
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/promptusRestApi/Default/api/project/{projectId}/prompt/{promptId}/OPTIONS/Resource", [
            {
                id: "AwsSolutions-APIG4",
                reason: "OPTIONS call for CORS support"
            }, {
                id: "AwsSolutions-COG4",
                reason: "OPTIONS call for CORS support"
            },
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/promptusRestApi/Default/api/project/{projectId}/prompt/{promptId}/comment/OPTIONS/Resource", [
            {
                id: "AwsSolutions-APIG4",
                reason: "OPTIONS call for CORS support"
            }, {
                id: "AwsSolutions-COG4",
                reason: "OPTIONS call for CORS support"
            },
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/promptusRestApi/Default/api/project/{projectId}/prompt/{promptId}/promptusQ/OPTIONS/Resource", [
            {
                id: "AwsSolutions-APIG4",
                reason: "OPTIONS call for CORS support"
            }, {
                id: "AwsSolutions-COG4",
                reason: "OPTIONS call for CORS support"
            },
        ])
        NagSuppressions.addResourceSuppressionsByPath(this, "/PromptusApplicationStack/promptusRestApi/Default/api/prompt/OPTIONS/Resource", [
            {
                id: "AwsSolutions-APIG4",
                reason: "OPTIONS call for CORS support"
            }, {
                id: "AwsSolutions-COG4",
                reason: "OPTIONS call for CORS support"
            },
        ])
    }

    private createDynamoDbTable() {
        this.promptusDynamoTable = new dynamodb.Table(this, 'promptusData', {
            partitionKey: {
                name: 'entityId',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'entityContextId',
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        this.promptusDynamoTable.addGlobalSecondaryIndex({
            indexName: "publicEntityIndex",
            partitionKey: {
                name: "publicEntity",
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: "entityId",
                type: dynamodb.AttributeType.STRING
            },
            projectionType: dynamodb.ProjectionType.ALL
        })
        this.promptusDynamoTable.addGlobalSecondaryIndex({
            indexName: "publicEntityContextIndex",
            partitionKey: {
                name: "publicEntity",
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: "entityContextId",
                type: dynamodb.AttributeType.STRING
            },
            projectionType: dynamodb.ProjectionType.ALL
        })
        this.promptusDynamoTable.addGlobalSecondaryIndex({
            indexName: "promptDetailVersionIndex",
            partitionKey: {
                name: "entityId",
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: "version",
                type: dynamodb.AttributeType.NUMBER
            },
            projectionType: dynamodb.ProjectionType.ALL
        })
    }

    private createRestApi(layer: LayerVersion, bucket: IBucket) {
        let restApi = new agw.RestApi(this, "promptusRestApi", {
            deployOptions: {
                stageName: "api",
                tracingEnabled: true,
                accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
                accessLogDestination: new LogGroupLogDestination(new LogGroup(this, 'LogGroup', {
                    logGroupName: '/aws/apigateway/promptus/accesslogs',
                    removalPolicy: RemovalPolicy.DESTROY,
                })),
                loggingLevel: MethodLoggingLevel.ERROR
            },
            defaultCorsPreflightOptions: {
                allowOrigins: agw.Cors.ALL_ORIGINS,
                allowMethods: agw.Cors.ALL_METHODS,
            },
            cloudWatchRole: true
        });
        this.createApiResources(restApi.root, layer, bucket);
        return restApi;
    }

    private createApiResources(rootResource: IResource, layer: LayerVersion, bucket: IBucket) {
        const bedrockAccessPolicy = ManagedPolicy.fromAwsManagedPolicyName("AmazonBedrockFullAccess")
        let apiResource = rootResource.addResource("api");
        const project = apiResource.addResource("project");
        let createProjectLambda = createApiLambda(this, "createProject", layer, {
            DYNAMO_TABLE: this.promptusDynamoTable.tableName
        });
        project.addMethod("POST", new agw.LambdaIntegration(createProjectLambda), {
            authorizer: this.authorizer,
            authorizationType: agw.AuthorizationType.COGNITO,
        })
        this.promptusDynamoTable.grantWriteData(createProjectLambda)
        let listProjectLambda = createApiLambda(this, "listProjects", layer, {
            DYNAMO_TABLE: this.promptusDynamoTable.tableName
        });
        project.addMethod("GET", new agw.LambdaIntegration(listProjectLambda), {
            authorizer: this.authorizer,
            authorizationType: agw.AuthorizationType.COGNITO,
        })
        this.promptusDynamoTable.grantReadData(listProjectLambda)
        const projectDetail = project.addResource("{projectId}")
        const projectPrompt = projectDetail.addResource("prompt")
        let projectPromptDetail = projectPrompt.addResource("{promptId}")
        let getPromptLambda = createApiLambda(this, "getPrompt", layer, {
            DYNAMO_TABLE: this.promptusDynamoTable.tableName
        }, undefined, [bedrockAccessPolicy]);
        this.promptusDynamoTable.grantReadData(getPromptLambda)
        projectPromptDetail.addMethod("GET", new agw.LambdaIntegration(getPromptLambda), {
            authorizer: this.authorizer,
            authorizationType: agw.AuthorizationType.COGNITO,
        })
        let deletePromptLambda = createApiLambda(this, "deletePrompt", layer, {
            DYNAMO_TABLE: this.promptusDynamoTable.tableName
        });
        this.promptusDynamoTable.grantReadWriteData(deletePromptLambda)
        projectPromptDetail.addMethod("DELETE", new agw.LambdaIntegration(deletePromptLambda), {
            authorizer: this.authorizer,
            authorizationType: agw.AuthorizationType.COGNITO,
        });
        const projectPromptComment = projectPromptDetail.addResource("comment")
        let addCommentLambda = createApiLambda(this, "addComment", layer, {
            DYNAMO_TABLE: this.promptusDynamoTable.tableName
        }, undefined, [bedrockAccessPolicy]);
        this.promptusDynamoTable.grantReadWriteData(addCommentLambda)
        projectPromptComment.addMethod("POST", new agw.LambdaIntegration(addCommentLambda), {
            authorizer: this.authorizer,
            authorizationType: agw.AuthorizationType.COGNITO,
        })
        let executePrompt = createApiLambda(this, "executePrompt", layer, {
            DYNAMO_TABLE: this.promptusDynamoTable.tableName,
            BUCKET: bucket.bucketName
        }, undefined, [bedrockAccessPolicy], 30);
        bucket.grantPut(executePrompt)
        this.promptusDynamoTable.grantReadData(executePrompt)
        this.promptusDynamoTable.grantWriteData(executePrompt)
        projectPromptDetail.addMethod("POST", new agw.LambdaIntegration(executePrompt), {
            authorizer: this.authorizer,
            authorizationType: agw.AuthorizationType.COGNITO,
        })
        let promptusQResource = projectPromptDetail.addResource("promptusQ");
        let promptusQLambda = createApiLambda(this, "promptusQ", layer, {
            DYNAMO_TABLE: this.promptusDynamoTable.tableName
        }, undefined, [bedrockAccessPolicy], 30);
        promptusQResource.addMethod("POST", new agw.LambdaIntegration(promptusQLambda), {
            authorizer: this.authorizer,
            authorizationType: agw.AuthorizationType.COGNITO,
        })
        this.promptusDynamoTable.grantReadWriteData(promptusQLambda)
        const prompt = apiResource.addResource("prompt");
        let createPromptLambda = createApiLambda(this, "createPrompt", layer, {
            DYNAMO_TABLE: this.promptusDynamoTable.tableName
        });
        prompt.addMethod("POST", new agw.LambdaIntegration(createPromptLambda), {
            authorizer: this.authorizer,
            authorizationType: agw.AuthorizationType.COGNITO,
        })
        this.promptusDynamoTable.grantWriteData(createPromptLambda)
        let listPromptLambda = createApiLambda(this, "listPrompts", layer, {
            DYNAMO_TABLE: this.promptusDynamoTable.tableName
        });
        prompt.addMethod("GET", new agw.LambdaIntegration(listPromptLambda), {
            authorizer: this.authorizer,
            authorizationType: agw.AuthorizationType.COGNITO,
        })
        this.promptusDynamoTable.grantReadData(listPromptLambda)
    }

    private createLambdaLayer(): LayerVersion {
        return new LayerVersion(this, "LambdaLayer", {
            compatibleRuntimes: [Runtime.NODEJS_20_X],
            code: AssetCode.fromAsset(path.resolve("..", "lambda", "dist", "layer"))
        })
    }

    private createStaticResourcesBucket() {
        let bucket = new s3.Bucket(this, "staticBucket", {
            removalPolicy: RemovalPolicy.DESTROY,
            enforceSSL: true
        });
        NagSuppressions.addResourceSuppressions(bucket, [{
            id: "AwsSolutions-S1",
            reason: "Static resources bucket not requiring access logging"
        }])
        return bucket
    }

    private createCloudFrontDistribution(bucket
                                             :
                                             Bucket, apiGateway
                                             :
                                             RestApi, certificate ?: Certificate
    ) {
        const cfOriginAccessIdentity = new cloudfront.OriginAccessIdentity(
            this,
            "cfOriginAccessIdentity",
            {}
        );
        bucket.grantRead(cfOriginAccessIdentity)
        const restApiAuthHeaderCachePolicy = new cloudfront.CachePolicy(this, 'forwardAuthHeaderPolicy', {
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization'),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
            minTtl: Duration.seconds(0),
            maxTtl: Duration.seconds(1),
            defaultTtl: Duration.seconds(0)
        });
        let dist = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(bucket, {
                    originAccessIdentity: cfOriginAccessIdentity
                }),
            },
            defaultRootObject: "index.html",
            certificate: this.node.tryGetContext('USE_CUSTOM_DOMAIN') === "true" ? certificate : undefined,
            domainNames: this.node.tryGetContext('USE_CUSTOM_DOMAIN') === "true" ? [this.node.tryGetContext('DOMAIN')] : [],
            minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
            sslSupportMethod: SSLMethod.SNI,
            enableLogging: true,
            errorResponses: [
                {
                    responseHttpStatus: 200,
                    responsePagePath: "/index.html",
                    httpStatus: 404
                },
                {
                    responseHttpStatus: 200,
                    responsePagePath: "/index.html",
                    httpStatus: 403
                }
            ]
        });
        dist.addBehavior("/api*", new origins.RestApiOrigin(apiGateway, {}), {
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: restApiAuthHeaderCachePolicy,
        })
        return dist
    }
}
