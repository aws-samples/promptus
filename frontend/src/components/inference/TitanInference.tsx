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

import {
    Box,
    Button,
    Container,
    ExpandableSection,
    FormField,
    Grid,
    Input,
    Modal,
    SpaceBetween,
    Textarea,
    TokenGroup,
    TokenGroupProps
} from "@cloudscape-design/components";
import React, {useState} from "react";
import {TitanInferenceEntity} from "promptusCommon/Entities";

{/*Component to display Titan inference parameters and handle requests to the Titan models*/}
interface TitanInferenceProps {
    titanInference: TitanInferenceEntity
    onChange: (titanInference: TitanInferenceEntity) => void
}

function TitanInference(props: TitanInferenceProps) {

    const [addStopSequenceVisible, setAddStopSequenceVisible] = useState(false)
    const [stopSequence, setStopSequence] = useState("")

    const titanInference = props.titanInference;

    function addStopSequence() {
        const newStopSequence = titanInference.textGenerationConfig.stopSequences
        newStopSequence.push(stopSequence)
        titanInference.textGenerationConfig.stopSequences = newStopSequence
        hideAlert()
    }

    function hideAlert() {
        setStopSequence("")
        setAddStopSequenceVisible(false)
    }

    return (
        <Grid gridDefinition={[
            {colspan: {default: 12}},
            {colspan: {default: 12}}
        ]}>
            <FormField stretch={true} label="Prompt">
                <Textarea rows={5}
                          onChange={({detail}) => {
                              titanInference.inputText = detail.value
                              props.onChange(titanInference)
                          }}
                          value={titanInference.inputText}
                />
            </FormField>
            <ExpandableSection headerText="Amazon Titan inference parameters">
                <Container>
                    <Grid
                        gridDefinition={[
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12}},
                            {colspan: {default: 12}},
                        ]}
                    >
                        <div>
                            <FormField label="Temperature">
                                <Input onChange={event => {
                                    titanInference.textGenerationConfig.temperature = Number(event.detail.value)
                                    props.onChange(titanInference)
                                }} type={"number"} value={titanInference.textGenerationConfig.temperature.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Top P">
                                <Input onChange={event => {
                                    titanInference.textGenerationConfig.topP = Number(event.detail.value)
                                    props.onChange(titanInference)
                                }} type={"number"} value={titanInference.textGenerationConfig.topP.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Max tokens to sample">
                                <Input onChange={event => {
                                    titanInference.textGenerationConfig.maxTokenCount = Number(event.detail.value)
                                    props.onChange(titanInference)
                                }} type={"number"}
                                       value={titanInference.textGenerationConfig.maxTokenCount.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Stop sequences">
                                <TokenGroup onDismiss={event => {
                                    const currentStopSequences = titanInference.textGenerationConfig.stopSequences
                                    currentStopSequences.splice(event.detail.itemIndex, 1)
                                    titanInference.textGenerationConfig.stopSequences = currentStopSequences
                                    props.onChange(titanInference)
                                }} items={titanInference.textGenerationConfig.stopSequences.map(value => {
                                    return {label: value.replaceAll("\n", "\\n")} as TokenGroupProps.Item
                                })}></TokenGroup>
                            </FormField>
                        </div>
                        <div>
                            <Button iconName={"add-plus"} onClick={() => {
                                setAddStopSequenceVisible(true)
                            }}>Add stop sequence</Button>
                        </div>
                    </Grid>
                    <Modal
                        onDismiss={() => {
                            hideAlert();
                        }}
                        visible={addStopSequenceVisible}
                        footer={
                            <Box float="right">
                                <SpaceBetween direction="horizontal" size="xs">
                                    <Button variant="link" onClick={() => {
                                        hideAlert();
                                    }}>Cancel</Button>
                                    <Button variant="primary" onClick={() => addStopSequence()}>Add prompt</Button>
                                </SpaceBetween>
                            </Box>
                        }
                        header="Add new stop sequence"
                    >
                        <SpaceBetween size="s">
                            <FormField
                                label="Stop sequence"
                            >
                                <Input value={stopSequence} onChange={event => setStopSequence(event.detail.value)}/>
                            </FormField>
                        </SpaceBetween>
                    </Modal>
                </Container>
            </ExpandableSection>
        </Grid>
    )
}

export default TitanInference