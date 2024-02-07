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
import {Ai21InferenceEntity} from "promptusCommon/Entities";

{/*Component to display and edit AI inference parameters and handle requests to the Ai21 models*/
}

interface Ai21InferenceProps {
    ai21Inference: Ai21InferenceEntity
    onChange: (ai21Inference: Ai21InferenceEntity) => void
}

function Ai21Inference(props: Ai21InferenceProps) {

    const [addStopSequenceVisible, setAddStopSequenceVisible] = useState(false)
    const [stopSequence, setStopSequence] = useState("")

    const ai21Inference = props.ai21Inference;

    function addStopSequence() {
        const newStopSequence = ai21Inference.stopSequences
        newStopSequence.push(stopSequence)
        ai21Inference.stopSequences = newStopSequence
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
                              ai21Inference.prompt = detail.value
                              props.onChange(ai21Inference)
                          }}
                          value={ai21Inference.prompt}
                />
            </FormField>
            <ExpandableSection headerText="Ai21 inference parameters">
                <Container>
                    <Grid
                        gridDefinition={[
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12}},
                        ]}
                    >
                        <div>
                            <FormField label="Temperature">
                                <Input onChange={event => {
                                    ai21Inference.temperature = Number(event.detail.value)
                                    props.onChange(ai21Inference)
                                }} type={"number"} value={ai21Inference.temperature.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Top P">
                                <Input onChange={event => {
                                    ai21Inference.topP = Number(event.detail.value)
                                    props.onChange(ai21Inference)
                                }} type={"number"} value={ai21Inference.topP.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Max tokens to sample">
                                <Input onChange={event => {
                                    ai21Inference.maxTokens = Number(event.detail.value)
                                    props.onChange(ai21Inference)
                                }} type={"number"} value={ai21Inference.maxTokens.toString()}></Input>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Stop sequences">
                                <TokenGroup onDismiss={event => {
                                    const currentStopSequences = ai21Inference.stopSequences
                                    currentStopSequences.splice(event.detail.itemIndex, 1)
                                    ai21Inference.stopSequences = currentStopSequences
                                    props.onChange(ai21Inference)
                                }} items={ai21Inference.stopSequences.map(value => {
                                    return {label: value.replaceAll("\n", "\\n")} as TokenGroupProps.Item
                                })}></TokenGroup>
                            </FormField>
                        </div>
                        <div>
                            <Button iconName={"add-plus"} onClick={event => {
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

export default Ai21Inference