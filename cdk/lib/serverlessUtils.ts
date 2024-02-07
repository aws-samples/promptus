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

import * as lambda from "aws-cdk-lib/aws-lambda"
import {IFunction, LayerVersion, RuntimeManagementMode, Tracing} from "aws-cdk-lib/aws-lambda"
import {Construct} from "constructs";
import * as logs from "aws-cdk-lib/aws-logs";
import {IManagedPolicy, PolicyStatement} from "aws-cdk-lib/aws-iam"
import {Duration, RemovalPolicy} from "aws-cdk-lib";
import * as path from "path";

export function createApiLambda(scope: Construct, name: string, layerVersion: LayerVersion, environment: {
    [key: string]: string
} = {}, policies?: PolicyStatement[], managedPolicies?: IManagedPolicy[], timeoutSeconds: number = 10): lambda.IFunction {
    return createLambdaInternal(scope, name, layerVersion, environment, timeoutSeconds, name, policies, managedPolicies)
}

function createLambdaInternal(scope: Construct, name: string, layerVersion: LayerVersion, environment: {
    [p: string]: string
}, timeoutSeconds: number, lambdaName: string, policies?: PolicyStatement[], managedPolicies?: IManagedPolicy[]): IFunction {
    let lambdaFunction = new lambda.Function(scope, name, {
            runtime: lambda.Runtime.NODEJS_20_X,
            runtimeManagementMode: RuntimeManagementMode.AUTO,
            code: lambda.Code.fromAsset(path.resolve("..", "lambda", "dist", "package", "lambda", "functions", lambdaName)),
            handler:
                "index.handler",
            tracing:
            Tracing.ACTIVE,
            timeout:
                Duration.seconds(timeoutSeconds),
            environment:
            environment,
            layers:
                [layerVersion]
        })
    ;
    new logs.LogGroup(
        scope, name + "Logs",
        {
            logGroupName: "/aws/lambda/" + lambdaFunction.functionName,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: RemovalPolicy.DESTROY
        }
    )
    policies?.forEach(value => {
        lambdaFunction.addToRolePolicy(value)
    })
    managedPolicies?.forEach(value => {
        lambdaFunction.role?.addManagedPolicy(value)
    })
    return lambdaFunction;
}