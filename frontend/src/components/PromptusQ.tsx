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

import {Button, FormField, Header, Modal, SpaceBetween, Textarea} from "@cloudscape-design/components";
import React, {useState} from "react";
import * as worker_threads from "worker_threads";

interface PromptusQProps {
    visible: boolean
    onDismiss: () => void;
    onFetchSuggestion: (description: string) => void
    resultingPrompt: string
    onApplySuggestion: (suggestion: string) => void
    working: boolean
}

{/*
// Component for Promptus Q modal
// Allows optimizing your prompt using the LLM itself
*/
}

function PromptusQ(props: PromptusQProps) {

    const [prompDescription, setPromptDescription] = useState("")

    return (
        <Modal header={<Header>Promptus Q</Header>} onDismiss={event => {
            props.onDismiss()
        }} size={"large"} visible={props.visible}>
            <SpaceBetween size={"m"}>
                {props.resultingPrompt !== "" &&
                    <>
                        <FormField stretch={true}
                                   label={"Promptus Q optimized prompt"}>
                            <Textarea rows={10} disabled={true} value={props.resultingPrompt!}></Textarea>
                        </FormField>
                        <SpaceBetween size={"m"} direction={"horizontal"}>
                            <Button disabled={props.working} iconName={"close"} onClick={event => {
                                setPromptDescription("")
                                props.onDismiss()
                            }}
                                    variant={"link"}>Cancel</Button>
                            <Button disabled={props.working} variant={"primary"}
                                    iconName={props.working ? "status-in-progress" : "check"}
                                    onClick={event => props.onApplySuggestion(props.resultingPrompt!)}>Apply optimized
                                prompt</Button>
                        </SpaceBetween>
                    </>
                }
                {props.resultingPrompt === "" &&
                    <>
                        <FormField stretch={true}
                                   label={"Describe what you want to achieve with your prompt. Promptus Q will help you to formulate the most efficient prompt to solve your task."}>
                            <Textarea rows={10} value={prompDescription}
                                      onChange={event => setPromptDescription(event.detail.value)}></Textarea>
                        </FormField>
                        <SpaceBetween size={"m"} direction={"horizontal"}>
                            <Button iconName={"close"} onClick={event => {
                                setPromptDescription("")
                                props.onDismiss()
                            }}
                                    variant={"link"}>Cancel</Button>
                            <Button variant={"primary"} iconName={props.working ? "status-in-progress" : "suggestions"}
                                    onClick={event => props.onFetchSuggestion(prompDescription)}>Optimize prompt using
                                Promptus
                                Q</Button>
                        </SpaceBetween>
                    </>
                }
            </SpaceBetween>
        </Modal>
    )
        ;

}

export default PromptusQ;