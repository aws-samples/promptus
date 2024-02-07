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
    Ai21InferenceEntity,
    AnthropicInferenceEntity,
    MetaInferenceEntity,
    PromptDetail,
    PromptDetailEntity,
    TitanInferenceEntity
} from "promptusCommon/Entities";
import ReactDiffViewer, {DiffMethod} from "react-diff-viewer-continued";
import {Header, Modal} from "@cloudscape-design/components";
import React from "react";
import {BaseUtils} from "promptusCommon/BaseUtils";

interface PromptCompareProps {
    promptDetailLeft?: PromptDetailEntity,
    promptDetailRight?: PromptDetailEntity,
    visible: boolean
    onDismiss: () => void;
}

{/*
// Component for comparing two prompt versions
// Renders diff views of prompts and token counts
*/
}

function PromptCompare(props: PromptCompareProps) {

    function extractPrompt(promptDetail?: PromptDetail) {
        if (promptDetail?.modelUsed?.startsWith("anthropic")) {
            return (promptDetail.inference as AnthropicInferenceEntity).prompt
        } else if (promptDetail?.modelUsed?.startsWith("ai21")) {
            return (promptDetail.inference as Ai21InferenceEntity).prompt
        } else if (promptDetail?.modelUsed?.startsWith("amazon")) {
            return (promptDetail.inference as TitanInferenceEntity).inputText
        } else if (promptDetail?.modelUsed?.startsWith("meta")) {
            return (promptDetail.inference as MetaInferenceEntity).prompt
        }
    }

    return (
        <Modal header={<Header>Compare prompts</Header>} onDismiss={event => {
            props.onDismiss()
        }} size={"large"} visible={props.visible}>
            <h3>Prompt compare</h3>
            <ReactDiffViewer leftTitle={"Version " + props.promptDetailLeft?.version}
                             rightTitle={"Version " + props.promptDetailRight?.version} hideLineNumbers={true}
                             splitView={true} compareMethod={DiffMethod.WORDS_WITH_SPACE}
                             oldValue={extractPrompt(props.promptDetailLeft?.promptDetail)}
                             newValue={extractPrompt(props.promptDetailRight?.promptDetail)}></ReactDiffViewer>
            <h3>Prompt input token count compare</h3>
            <ReactDiffViewer
                leftTitle={"Version " + props.promptDetailLeft?.version + "\nModel: " + props.promptDetailLeft?.promptDetail.modelUsed}
                rightTitle={"Version " + props.promptDetailRight?.version + "\nModel: " + props.promptDetailLeft?.promptDetail.modelUsed}
                hideLineNumbers={true}
                splitView={true} compareMethod={DiffMethod.WORDS_WITH_SPACE}
                oldValue={BaseUtils.calculateTokenFromText(extractPrompt(props.promptDetailLeft?.promptDetail)) + ""}
                newValue={BaseUtils.calculateTokenFromText(extractPrompt(props.promptDetailLeft?.promptDetail)) + ""}></ReactDiffViewer>
            <h3>Response compare</h3>
            <ReactDiffViewer
                leftTitle={"Version " + props.promptDetailLeft?.version + "\nModel: " + props.promptDetailLeft?.promptDetail.modelUsed}
                rightTitle={"Version " + props.promptDetailRight?.version + "\nModel: " + props.promptDetailLeft?.promptDetail.modelUsed}
                hideLineNumbers={true}
                splitView={true} compareMethod={DiffMethod.WORDS_WITH_SPACE}
                oldValue={props.promptDetailLeft?.promptDetail.answerParsed}
                newValue={props.promptDetailRight?.promptDetail.answerParsed}></ReactDiffViewer>
            <h3>Prompt output token count compare</h3>
            <ReactDiffViewer
                leftTitle={"Version " + props.promptDetailLeft?.version + "\nModel: " + props.promptDetailLeft?.promptDetail.modelUsed}
                rightTitle={"Version " + props.promptDetailRight?.version + "\nModel: " + props.promptDetailLeft?.promptDetail.modelUsed}
                hideLineNumbers={true}
                splitView={true} compareMethod={DiffMethod.WORDS_WITH_SPACE}
                oldValue={BaseUtils.calculateTokenFromText(props.promptDetailLeft?.promptDetail.answerParsed) + ""}
                newValue={BaseUtils.calculateTokenFromText(props.promptDetailRight?.promptDetail.answerParsed) + ""}></ReactDiffViewer>
        </Modal>
    );

}

export default PromptCompare;