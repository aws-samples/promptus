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
import {StabilityInferenceEntity, TitanImageInferenceEntity} from "promptusCommon/Entities";

{/*Component to display Titan inference parameters and handle requests to the Titan models*/
}

interface StabilityImageInferenceProps {
    stabilityInferenceEntity: StabilityInferenceEntity
    onChange: (stabilityInference: StabilityInferenceEntity) => void
}

function StabilityImageInference(props: StabilityImageInferenceProps) {

    const stabilityInferenceEntity = props.stabilityInferenceEntity;

    return (
        <Grid gridDefinition={[
            {colspan: {default: 12}},
            {colspan: {default: 12}}
        ]}>
            <FormField stretch={true} label="Prompt">
                <Textarea rows={5}
                          onChange={({detail}) => {
                              stabilityInferenceEntity.text_prompts[0].text = detail.value
                              props.onChange(stabilityInferenceEntity)
                          }}
                          value={stabilityInferenceEntity.text_prompts[0].text}
                />
            </FormField>
            <ExpandableSection headerText="Stability inference parameters">
                <Container>
                    <Grid
                        gridDefinition={[
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                        ]}
                    >
                        <div>
                            <FormField label="Width">
                                <Input onChange={event => {
                                    stabilityInferenceEntity.width = Number(event.detail.value)
                                    props.onChange(stabilityInferenceEntity)
                                }} type={"number"}
                                       value={stabilityInferenceEntity.width.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Height">
                                <Input onChange={event => {
                                    stabilityInferenceEntity.height = Number(event.detail.value)
                                    props.onChange(stabilityInferenceEntity)
                                }} type={"number"}
                                       value={stabilityInferenceEntity.height.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Prompt strength">
                                <Input onChange={event => {
                                    stabilityInferenceEntity.cfg_scale = Number(event.detail.value)
                                    props.onChange(stabilityInferenceEntity)
                                }} type={"number"}
                                       value={stabilityInferenceEntity.cfg_scale.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Generation step">
                                <Input onChange={event => {
                                    stabilityInferenceEntity.steps = Number(event.detail.value)
                                    props.onChange(stabilityInferenceEntity)
                                }} type={"number"}
                                       value={stabilityInferenceEntity.steps.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Seed">
                                <Input onChange={event => {
                                    stabilityInferenceEntity.seed = Number(event.detail.value)
                                    props.onChange(stabilityInferenceEntity)
                                }} type={"number"}
                                       value={stabilityInferenceEntity.seed.toString()}></Input>
                            </FormField>
                        </div>
                    </Grid>
                </Container>
            </ExpandableSection>
        </Grid>
    )
}

export default StabilityImageInference