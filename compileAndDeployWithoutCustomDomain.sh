#!/bin/zsh
#
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this
# software and associated documentation files (the "Software"), to deal in the Software
# without restriction, including without limitation the rights to use, copy, modify,
# merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
#  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#

cd ./promptusCommon || exit
npm install || exit
npm run build || exit
cd .. || exit
npm install || exit
cd ./lambda || exit
rm -rf ./dist|| exit
npm install || exit
npm run build || exit
cd .. || exit
esbuild --bundle --platform=node --sourcemap ./lambda/common/AwsUtils.ts --outdir=./lambda/dist/layer/nodejs || exit
esbuild --bundle --platform=node --sourcemap ./promptusCommon/BaseUtils.ts --outdir=./lambda/dist/layer/nodejs/node_modules/promptusCommon || exit
esbuild --bundle --platform=node --sourcemap ./promptusCommon/Entities.ts --outdir=./lambda/dist/layer/nodejs/node_modules/promptusCommon || exit
cp -r ./lambda/node_modules ./lambda/dist/layer/nodejs || exit
cd cdk || exit
npm install || exit
npm run build || exit
cdk deploy -c USE_CUSTOM_DOMAIN="false" -c VALID_MAIL_DOMAINS="amazon.com" -c USE_SES_COGNITO="false" -c FROM_NAME="Promptus Signup" --outputs-file ./cdk-outputs.json --require-approval never --all || exit
cd ../frontend || exit
npm install || exit
node buildEnvVars.js
npm run build || exit
aws s3 sync ./build/ "$(cat bucketName.txt)"