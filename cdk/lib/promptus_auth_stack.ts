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

import * as cdk from 'aws-cdk-lib';
import {CfnOutput, Duration, RemovalPolicy, Stack} from 'aws-cdk-lib';
import * as cognito from "aws-cdk-lib/aws-cognito";
import {AdvancedSecurityMode, UserPoolOperation} from "aws-cdk-lib/aws-cognito";
import {Construct} from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import {RuntimeManagementMode, Tracing} from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ses from "aws-cdk-lib/aws-ses";

import * as path from "path";
import * as route53 from "aws-cdk-lib/aws-route53";
import {NagSuppressions} from "cdk-nag";

export class PromputsAuthStack extends cdk.Stack {
    public readonly userPool: cognito.UserPool;
    public readonly client: cognito.UserPoolClient;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        NagSuppressions.addStackSuppressions(this, [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Using AWSLambdaBasicExecutionRole for Lambda Execution.'
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Using Cognito UserPool addTrigger function.',
                appliesTo: ["Resource::*"]
            },
        ])
        let cognitoProperties = {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            mfa: cognito.Mfa.OPTIONAL,
            mfaSecondFactor: {
                otp: true,
                sms: false,
            },
            selfSignUpEnabled: true,
            email: cognito.UserPoolEmail.withCognito(),
            userVerification: {
                emailSubject: "Verify your email for Promptus",
            },
            passwordPolicy: {
                minLength: 8,
                requireDigits: true,
                requireUppercase: true,
                requireLowercase: true,
                requireSymbols: true
            },
            advancedSecurityMode: AdvancedSecurityMode.ENFORCED,
            autoVerify: {
                email: true,
                phone: false,
            },
            standardAttributes: {
                email: {
                    required: true,
                }
            },
            keepOriginal: {
                email: true
            }
        };
        if (this.node.tryGetContext('USE_SES_COGNITO') === "true") {
            this.createSes()
            cognitoProperties.email = cognito.UserPoolEmail.withSES({
                sesRegion: Stack.of(this).region,
                sesVerifiedDomain: this.node.tryGetContext('HOSTED_ZONE_NAME'),
                fromEmail: this.node.tryGetContext('FROM_EMAIL'),
                fromName: this.node.tryGetContext('FROM_NAME'),
            })
        }
        const userPool = new cognito.UserPool(this, "PromptusUserPool", cognitoProperties);
        const client = userPool.addClient("PromptusWebClient", {
            userPoolClientName: "webClient",
            idTokenValidity: cdk.Duration.days(1),
            accessTokenValidity: cdk.Duration.days(1),
            authFlows: {
                userPassword: true,
                userSrp: true,
                custom: true,
            }
        });
        const preSignUpLambda = this.createPreSignUpLambda(this);
        this.userPool = userPool;
        this.userPool.addTrigger(UserPoolOperation.PRE_SIGN_UP, preSignUpLambda)
        this.client = client;

        new CfnOutput(this, "CognitoUserPoolId", {
            value: userPool.userPoolId,
            description: "userPoolId required for frontend settings",
        });
        new CfnOutput(this, "CognitoUserPoolWebClientId", {
            value: client.userPoolClientId,
            description: "clientId required for frontend settings",
        });
    }

    private createPreSignUpLambda(scope: Construct) {
        let name = "CognitoPreSignUp";
        const preSignUpLambda = new lambda.Function(scope, name, {
            runtime: lambda.Runtime.NODEJS_20_X,
            runtimeManagementMode:  RuntimeManagementMode.AUTO,
            code: lambda.Code.fromAsset(path.resolve("..", "lambda", "dist", "package", "lambda", "functions", "cognitoPreSignUp")),
            handler: "index.handler",
            tracing: Tracing.ACTIVE,
            environment: {
                "VALID_MAILS": this.node.tryGetContext('VALID_MAIL_DOMAINS')
            },
            timeout: Duration.seconds(10),
        });
        new logs.LogGroup(scope, name + "Logs", {
                logGroupName: "/aws/lambda/" + preSignUpLambda.functionName,
                retention: logs.RetentionDays.ONE_MONTH,
                removalPolicy: RemovalPolicy.DESTROY
            }
        )
        return preSignUpLambda;
    }

    private createSes() {
        new ses.EmailIdentity(this, 'Identity', {
            identity: ses.Identity.publicHostedZone(route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
                hostedZoneId: this.node.tryGetContext('HOSTED_ZONE_ID'),
                zoneName: this.node.tryGetContext('HOSTED_ZONE_NAME')
            })),
            mailFromDomain: this.node.tryGetContext('DOMAIN')
        });
    }
}