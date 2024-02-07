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

import {Button, Icon, SpaceBetween, Textarea} from "@cloudscape-design/components";
import React, {useState} from "react";
import {PromptComment} from "promptusCommon/Entities";
import TimeTravelEntry from "./TimeTravelEntry";

interface TimeTravelProps {
    commentList?: PromptComment[],
    onComment: (comment: string) => void,
    switchToVersion: (version: number) => void;
    compareVersion: (version: number) => void;
    working: boolean;
}

{/*Component for time traveling through past versions of a prompt and comments*/
}

function TimeTravel(props: TimeTravelProps) {

    const [commentInput, setCommentInput] = useState("")

    return (
        <SpaceBetween size={"s"}>
            <Textarea value={commentInput} onChange={event => {
                setCommentInput(event.detail.value)
            }}/>
            <>
                <Button disabled={props.working} variant={"primary"} onClick={event => {
                    props.onComment(commentInput)
                    setCommentInput("")
                }}><Icon name={props.working ? "status-in-progress" : "add-plus"}/> Add comment</Button>
                <hr/>
                {props.commentList?.map(
                    comment => {
                        return <TimeTravelEntry key={comment.date} compareVersion={props.compareVersion}
                                                switchToVersion={props.switchToVersion}
                                                comment={comment}></TimeTravelEntry>
                    }
                )}
            </>
        </SpaceBetween>
    )
}

export default TimeTravel;