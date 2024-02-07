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
import {MetaInferenceEntity} from "promptusCommon/Entities";

interface MetaInferenceProps {
    metaInference: MetaInferenceEntity
    onChange: (metaInferenceEntity: MetaInferenceEntity) => void
}

{/*
Component to display a meta inference form for Meta models and handle updates to the meta inference object
*/
}

function MetaInference(props: MetaInferenceProps) {

    const metaInference = props.metaInference;

    return (
        <Grid gridDefinition={[
            {colspan: {default: 12}},
            {colspan: {default: 12}}
        ]}>
            <FormField stretch={true} label="Prompt">
                <Textarea rows={10}
                          onChange={({detail}) => {
                              metaInference.prompt = detail.value
                              props.onChange(metaInference)
                          }}
                          value={metaInference.prompt}
                />
            </FormField>
            <ExpandableSection headerText="Meta inference parameters">
                <Container>
                    <Grid
                        gridDefinition={[
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                        ]}
                    >
                        <div>
                            <FormField label="Temperature">
                                <Input onChange={event => {
                                    metaInference.temperature = Number(event.detail.value)
                                    props.onChange(metaInference)
                                }} type={"number"} value={metaInference.temperature.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Top P">
                                <Input onChange={event => {
                                    metaInference.top_p = Number(event.detail.value)
                                    props.onChange(metaInference)
                                }} type={"number"} value={metaInference.top_p.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Max tokens to sample">
                                <Input onChange={event => {
                                    metaInference.max_gen_len = Number(event.detail.value)
                                    props.onChange(metaInference)
                                }} type={"number"} value={metaInference.max_gen_len.toString()}></Input>
                            </FormField>
                        </div>
                    </Grid>
                </Container>
            </ExpandableSection>
        </Grid>
    )
}

export default MetaInference