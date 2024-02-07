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

import Skeleton from "react-loading-skeleton";
import {Textarea} from "@cloudscape-design/components";
import {NonCancelableEventHandler} from "@cloudscape-design/components/internal/events";
import {InputProps} from "@cloudscape-design/components/input/interfaces";
import React from "react";

export interface LoadingInputProps {
    onChange?: NonCancelableEventHandler<InputProps.ChangeDetail>;
    loading: boolean
    value?: string
    rows: number
    disabled?: boolean
}

function LoadingTextarea(props: LoadingInputProps) {
    if (props.loading) {
        return (<Skeleton/>)
    } else {
        return <Textarea disabled={props.disabled} rows={props.rows} value={props.value || ""}
                         onChange={props.onChange}/>
    }
}

export default LoadingTextarea;