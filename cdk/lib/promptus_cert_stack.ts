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
import * as cognito from "aws-cdk-lib/aws-cognito";
import {Construct} from 'constructs';
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import {CertificateValidation} from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";

export class PromptusCertStack extends cdk.Stack {
    public certificate?: acm.Certificate;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        if (this.node.tryGetContext('USE_CUSTOM_DOMAIN') === "true") {
            this.certificate = new acm.Certificate(
                this,
                "ApiCertificate", {
                    domainName: this.node.tryGetContext('DOMAIN'),
                    validation: CertificateValidation.fromDns(route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
                        hostedZoneId: this.node.tryGetContext('HOSTED_ZONE_ID'),
                        zoneName: this.node.tryGetContext('HOSTED_ZONE_NAME')
                    })),

                }
            );
        }

    }
}