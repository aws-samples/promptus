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

import {Container, ExpandableSection, FormField, Grid, Input, Textarea} from "@cloudscape-design/components";
import React from "react";
import {TitanImageInferenceEntity} from "promptusCommon/Entities";

{/*Component to display Titan inference parameters and handle requests to the Titan models*/
}

interface TitanImageInferenceProps {
    titanInference: TitanImageInferenceEntity
    onChange: (titanInference: TitanImageInferenceEntity) => void
}

function TitanImageInference(props: TitanImageInferenceProps) {

    const titanImageInference = props.titanInference;

    return (
        <Grid gridDefinition={[
            {colspan: {default: 12}},
            {colspan: {default: 12}}
        ]}>
            <FormField stretch={true} label="Prompt">
                <Textarea rows={5}
                          onChange={({detail}) => {
                              titanImageInference.textToImageParams.text = detail.value
                              props.onChange(titanImageInference)
                          }}
                          value={titanImageInference.textToImageParams.text}
                />
            </FormField>
            <ExpandableSection headerText="Amazon Titan inference parameters">
                <Container>
                    <Grid
                        gridDefinition={[
                            {colspan: {default: 12}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                        ]}
                    >
                        <div>
                            <FormField label="Negative prompt">
                                <Input onChange={event => {
                                    titanImageInference.textToImageParams.negativeText = event.detail.value
                                    props.onChange(titanImageInference)
                                }}
                                       value={titanImageInference.textToImageParams.negativeText || ""}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Width">
                                <Input onChange={event => {
                                    titanImageInference.imageGenerationConfig.width = Number(event.detail.value)
                                    props.onChange(titanImageInference)
                                }} type={"number"}
                                       value={titanImageInference.imageGenerationConfig.width.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Height">
                                <Input onChange={event => {
                                    titanImageInference.imageGenerationConfig.height = Number(event.detail.value)
                                    props.onChange(titanImageInference)
                                }} type={"number"}
                                       value={titanImageInference.imageGenerationConfig.height.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Number of images">
                                <Input onChange={event => {
                                    titanImageInference.imageGenerationConfig.numberOfImages = Number(event.detail.value)
                                    props.onChange(titanImageInference)
                                }} type={"number"}
                                       value={titanImageInference.imageGenerationConfig.numberOfImages.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Prompt strength">
                                <Input onChange={event => {
                                    titanImageInference.imageGenerationConfig.cfgScale = Number(event.detail.value)
                                    props.onChange(titanImageInference)
                                }} type={"number"}
                                       value={titanImageInference.imageGenerationConfig.cfgScale.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Seed">
                                <Input onChange={event => {
                                    titanImageInference.imageGenerationConfig.seed = Number(event.detail.value)
                                    props.onChange(titanImageInference)
                                }} type={"number"}
                                       value={titanImageInference.imageGenerationConfig.seed.toString()}></Input>
                            </FormField>
                        </div>
                    </Grid>
                </Container>
            </ExpandableSection>
        </Grid>
    )
}

export default TitanImageInference