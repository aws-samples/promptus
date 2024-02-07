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

import {PromptComment} from "promptusCommon/Entities";
import {useTokenValidation} from "../config/useHandler";
import React from "react";
import {Button, Container, Header, SpaceBetween} from "@cloudscape-design/components";

interface TimeTravelEntryProps {
    switchToVersion: (version: number) => void;
    compareVersion: (version: number) => void;
    comment: PromptComment,
}

{/*
// Component to display a prompt comment time travel entry
// Allows switching to a past version or comparing versions
*/
}


function TimeTravelEntry(props: TimeTravelEntryProps) {

    const {user} = useTokenValidation()

    if (props.comment.user === "SYSTEM") {
        return <Container header={
            <Header variant={"h3"} description={props.comment.date}>{props.comment.message}</Header>
        }>
            <Button variant={"link"} onClick={event => props.switchToVersion(props.comment.version)}>Switch to
                version</Button>
            <Button variant={"link"} onClick={event => props.compareVersion(props.comment.version)}>Compare</Button>
        </Container>
    } else {
        let title = props.comment.user + " commented"
        if (props.comment.user === user?.getUsername()) {
            title = "You commented"
        } else if (props.comment.user === "PROMPTUSQ") {
            title = props.comment.title!
        }
        return <Container header={
            <Header variant={"h3"}
                    description={props.comment.date + " on version " + props.comment.version}>{title}</Header>
        }>
            <SpaceBetween size={"m"}>
                <p>{props.comment.message}</p>
                <SpaceBetween size={"xs"} direction="horizontal">
                    <Button variant={"link"} onClick={event => props.switchToVersion(props.comment.version)}>Switch to
                        version</Button>
                    <Button variant={"link"}
                            onClick={event => props.compareVersion(props.comment.version)}>Compare</Button>
                </SpaceBetween>
            </SpaceBetween>
        </Container>
    }
}

export default TimeTravelEntry;