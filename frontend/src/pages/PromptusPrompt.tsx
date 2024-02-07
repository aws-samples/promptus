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

import React, {useEffect, useState} from "react";
import {
    Alert,
    AppLayout,
    AppLayoutProps,
    Button,
    Container,
    ContentLayout,
    FormField,
    Grid,
    Header,
    SelectProps,
    SpaceBetween, Spinner,
    SplitPanel,
    Tabs
} from "@cloudscape-design/components";
import Breadcrumb from "../components/Breadcrumb";
import {
    Ai21InferenceEntity,
    AnthropicInferenceEntity,
    MetaInferenceEntity, PromptComment,
    PromptCommentEntity,
    PromptDetail,
    PromptDetailDto,
    PromptDetailEntity, PromptusQDto,
    PromptusQEntity,
    TitanInferenceEntity
} from "promptusCommon/Entities";
import {useParams} from "react-router-dom";
import {useTokenValidation} from "../config/useHandler";
import LoadingTextarea from "../components/loading/LoadingTextArea";
import LoadingSelect from "../components/loading/LoadingSelect";
import LoadingJsonView from "../components/loading/LoadingJsonView";
import AnthropicInference from "../components/inference/AnthropicInference";
import Ai21Inference from "../components/inference/Ai21Inference";
import MetaInference from "../components/inference/MetaInference";
import TitanInference from "../components/inference/TitanInference";
import 'react-chat-elements/dist/main.css'
import '../App.css'
import TimeTravel from "../components/TimeTravel";
import PromptCompare from "../components/PromptCompare";
import PromptusQ from "../components/PromptusQ";
import {BaseUtils} from "promptusCommon/BaseUtils";


const COMMENT_SAVE_WORKING_MESSAGE = "Saving your comment";
const PROMPTUSQ_WORKING_MESSAGE = "Optimizing prompt using Promptus Q"
const EXECUTING_PROMPT_WORKING_MESSAGE = "Executing prompt";

function PromptusPrompt() {
    const {session, user} = useTokenValidation()
    const [loading, setLoading] = useState(true)
    const [timeTravelVisible, setTimeTravelVisible] = useState(true)
    let {promptusProjectId, promptusPromptId} = useParams();
    const [promptDetailDto, setPromptDetailDto] = useState<PromptDetailDto>()
    const [promptDetail, setPromptDetail] = useState<PromptDetail>()
    const [errorMessage, setErrorMessage] = useState("")
    const [modelOptions, setModelOptions] = useState<SelectProps.Option[]>([])
    const [selectedModel, setSelectedModel] = useState<SelectProps.Option>({})
    const [versionSelectOptions, setVersionSelectOptions] = useState<SelectProps.Option[]>([])
    const [selectedVersion, setSelectedVersion] = useState<SelectProps.Option>({})
    const [compareVisible, setCompareVisible] = useState(false)
    const [compareVersion, setCompareVersion] = useState<PromptDetailEntity>()
    const [timeTravelPosition, setTimeTravelPosition] = useState<AppLayoutProps.SplitPanelPosition>('side')
    const [promptusQVisible, setPromptusQVisible] = useState(false)
    const [optimizedPrompt, setOptimizedPrompt] = useState("")
    const [workingMessage, setWorkingMessage] = useState("")

    function loadData(loading: boolean) {
        setLoading(loading)
        fetch(process.env.REACT_APP_API_URL + "/api/project/" + promptusProjectId + "/prompt/" + promptusPromptId, {
            method: "GET",
            headers: {
                Authorization: session!.getIdToken().getJwtToken()
            }
        })
            .then((response) => response.json())
            .then((responseJson) => {
                let promptDetailDto = responseJson as PromptDetailDto;
                let lastModelUsed = ""
                if (!promptDetailDto.promptDetailEntity || promptDetailDto.promptDetailEntity.length === 0) {
                    setPromptDetail({} as PromptDetail)
                } else {
                    lastModelUsed = (promptDetailDto.promptDetailEntity[0] as PromptDetailEntity).promptDetail?.modelUsed!
                    setPromptDetail((promptDetailDto.promptDetailEntity[0] as PromptDetailEntity).promptDetail)
                }
                setPromptDetailDto(responseJson)
                let versionSelectOptions = [] as SelectProps.Option[]
                promptDetailDto?.promptDetailEntity.forEach((value, index) => {
                    versionSelectOptions.push({
                        label: "Version " + value.entityContextId + " (" + value.promptDetail.date + " )",
                        value: index + ""
                    })
                })
                setVersionSelectOptions(versionSelectOptions)
                setSelectedVersion(versionSelectOptions[0])
                let modelSelectOptions = [] as SelectProps.Option[]
                promptDetailDto?.models.forEach(value => {
                    let option = {label: value.modelName + " (" + value.modelId + ")", value: value.modelId};
                    if (value.modelId === lastModelUsed) {
                        setSelectedModel(option)
                    }
                    modelSelectOptions.push(option)
                })
                setModelOptions(modelSelectOptions)
            })
            .catch((error) => setErrorMessage("Error loading prompt details: " + error.message))
            .finally(() => setLoading(false));
    }

    async function executePrompt() {
        setWorkingMessage(EXECUTING_PROMPT_WORKING_MESSAGE)
        setErrorMessage("")
        const body = {
            entityId: promptDetailDto?.promptEntity.entityId,
            entityContextId: promptDetailDto?.promptEntity.entityContextId,
            promptDetail: promptDetail
        } as PromptDetailEntity
        try {
            const response = await fetch(process.env.REACT_APP_API_URL + "/api/project/" + promptusProjectId + "/prompt/" + promptusPromptId + "?saveNewVersion=true", {
                method: "POST",
                headers: {
                    Authorization: session!.getIdToken().getJwtToken()
                },
                body: JSON.stringify(body)
            })
            if (response.status === 200) {
                loadData(false)
                setWorkingMessage("")
            } else {
                setWorkingMessage("")
                setErrorMessage("Error executing prompt: " + await response.text())
            }
        } catch (error: any) {
            setWorkingMessage("")
            setErrorMessage("Error loading prompt details: " + error.message)
        } finally {
            setWorkingMessage("")
        }
    }

    useEffect(() => {
        loadData(true)
    }, []);

    async function saveComment(comment: string) {
        setWorkingMessage(COMMENT_SAVE_WORKING_MESSAGE)
        setErrorMessage("")
        let promptDetailEntity = promptDetailDto?.promptDetailEntity;
        const body = {
            entityId: promptDetailDto?.promptEntity.entityId,
            entityContextId: promptDetailDto?.promptEntity.entityContextId,
            promptComment: {
                date: new Date().toISOString(),
                message: comment,
                user: user?.getUsername(),
                version: promptDetailEntity![Number(selectedVersion.value!)].version
            }
        } as PromptCommentEntity
        try {
            const response = await fetch(process.env.REACT_APP_API_URL + "/api/project/" + promptusProjectId + "/prompt/" + promptusPromptId + "/comment", {
                method: "POST",
                headers: {
                    Authorization: session!.getIdToken().getJwtToken()
                },
                body: JSON.stringify(body)
            })
            if (response.status === 200) {
                const updatedPromptEntity = promptDetailDto?.promptEntity!
                updatedPromptEntity.comments.splice(0, 0, body.promptComment)
                setPromptDetailDto({
                    ...promptDetailDto,
                    promptEntity: updatedPromptEntity,
                } as PromptDetailDto)
            } else {
                setErrorMessage("Error saving comment: " + await response.text())
            }
        } catch (error: any) {
            setErrorMessage("Error saving comment: " + error.message)
        } finally {
            setWorkingMessage("")
        }
    }

    function selectedVersionChanged(index: number) {
        setSelectedVersion(versionSelectOptions[index])
        let promptDetail = promptDetailDto?.promptDetailEntity[index].promptDetail;
        setPromptDetail(promptDetail)
        modelOptions.forEach(value => {
            if (value.value === promptDetail?.modelUsed) {
                setSelectedModel(value)
            }
        })
    }

    async function promptusQ(description: string) {
        setWorkingMessage(PROMPTUSQ_WORKING_MESSAGE)
        setErrorMessage("")
        const body = {
            currentPrompt: BaseUtils.promptFromInference(promptDetail!),
            promptDescription: description,
            model: selectedModel.value,
            entityId: promptDetailDto?.promptEntity.entityId,
            entityContextId: promptDetailDto?.promptEntity.entityContextId,
        } as PromptusQEntity
        try {
            const response = await fetch(process.env.REACT_APP_API_URL + "/api/project/" + promptusProjectId + "/prompt/" + promptusPromptId + "/promptusQ", {
                method: "POST",
                headers: {
                    Authorization: session!.getIdToken().getJwtToken()
                },
                body: JSON.stringify(body)
            })
            if (response.status === 200) {
                const promptusQDto = await response.json() as PromptusQDto
                setOptimizedPrompt(promptusQDto.extractedText)
            } else {
                setErrorMessage("Error optimizing prompt: " + await response.text())
            }
        } catch (error: any) {
            setErrorMessage("Error optimizing prompt: " + error.message)
        } finally {
            setWorkingMessage("")
        }
    }

    function calculateOutputTokens() {
        return BaseUtils.calculateTokenFromText(promptDetail?.answerParsed!);
    }

    function calculateInputTokens() {
        if (promptDetail == null) {
            return 0
        }
        let prompt = BaseUtils.promptFromInference(promptDetail!);
        return BaseUtils.calculateTokenFromText(prompt);
    }

    return (
        <AppLayout breadcrumbs={<Breadcrumb/>} toolsHide={true} navigationHide={true} content={
            <ContentLayout header={
                <SpaceBetween direction={"vertical"} size="xl">
                    <Header variant="h1">
                        {workingMessage !== "" && <SpaceBetween size={"xs"} direction={"horizontal"}>
                            <Spinner/>
                            {workingMessage}
                        </SpaceBetween>}
                        {errorMessage !== "" &&
                            <Alert type="error">{errorMessage}</Alert>}
                        {/*<LoadingText loading={loading} value={promptDetailDto?.promptEntity.prompt.name}/>*/}
                    </Header>
                </SpaceBetween>
            }>
                <Container>
                    <Grid
                        gridDefinition={[
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12, xs: 6}},
                            {colspan: {default: 12}},
                            {colspan: {default: 6}},
                            {colspan: {default: 6}},
                            {colspan: {default: 12}},
                        ]}
                    >
                        <div>
                            <FormField label="Prompt version">
                                <LoadingSelect loading={loading}
                                               selectedOption={selectedVersion}
                                               options={versionSelectOptions}
                                               disabled={versionSelectOptions.length === 0}
                                               onChange={event => {
                                                   selectedVersionChanged(Number(event.detail.selectedOption.value))
                                               }}/>
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Model">
                                <LoadingSelect
                                    loading={loading}
                                    selectedOption={selectedModel}
                                    onChange={({detail}) => {
                                        setSelectedModel(detail.selectedOption)
                                        const inference = BaseUtils.inferenceForModel(detail.selectedOption.value || "", promptDetail?.inference?.prompt || "")
                                        setPromptDetail({
                                            ...promptDetail,
                                            modelUsed: detail.selectedOption.value,
                                            inference: inference
                                        })
                                    }
                                    }
                                    options={modelOptions}
                                />
                            </FormField>
                        </div>
                        <div>
                            {selectedModel.value?.startsWith("anthropic") &&
                                <AnthropicInference onChange={anthropicInferenceEntity => {
                                    setPromptDetail({
                                        ...promptDetail,
                                        inference: anthropicInferenceEntity
                                    })
                                }}
                                                    anthropicInference={promptDetail?.inference as AnthropicInferenceEntity}></AnthropicInference>}
                            {selectedModel.value?.startsWith("ai21") &&
                                <Ai21Inference onChange={ai21InferenceEntity => {
                                    setPromptDetail({
                                        ...promptDetail,
                                        inference: ai21InferenceEntity
                                    })
                                }}
                                               ai21Inference={promptDetail?.inference as Ai21InferenceEntity}></Ai21Inference>}
                            {selectedModel.value?.startsWith("meta") &&
                                <MetaInference onChange={metaInferenceEntity => {
                                    setPromptDetail({
                                        ...promptDetail,
                                        inference: metaInferenceEntity
                                    })
                                }}
                                               metaInference={promptDetail?.inference as MetaInferenceEntity}></MetaInference>}
                            {selectedModel.value?.startsWith("amazon") &&
                                <TitanInference onChange={titanInference => {
                                    setPromptDetail({
                                        ...promptDetail,
                                        inference: titanInference
                                    })
                                }}
                                                titanInference={promptDetail?.inference as TitanInferenceEntity}></TitanInference>}
                            {selectedModel.value === undefined &&
                                <h2>Select a model to define a prompt</h2>
                            }
                        </div>
                        <div>
                            <h3>Input tokens: {calculateInputTokens()}</h3>
                        </div>
                        <div>
                            <h3>Output tokens: {calculateOutputTokens()}</h3>
                        </div>
                        <div>
                            <Tabs
                                tabs={[
                                    {
                                        label: "Parsed response",
                                        id: "parsedResponse",
                                        content:
                                            <LoadingTextarea disabled={true} loading={loading} rows={10}
                                                             value={promptDetail?.answerParsed || ""}
                                            />
                                    },
                                    {
                                        label: "Response raw",
                                        id: "rawResponse",
                                        content:
                                            <LoadingJsonView loading={loading}
                                                             value={promptDetail?.answerRaw}/>

                                    }
                                ]}
                            />
                            <SpaceBetween size={"s"} direction={"horizontal"}>
                                <Button variant={"primary"}
                                        disabled={workingMessage === EXECUTING_PROMPT_WORKING_MESSAGE}
                                        onClick={executePrompt}
                                        iconName={workingMessage === EXECUTING_PROMPT_WORKING_MESSAGE ? "status-in-progress" : "upload"}>Execute
                                    prompt</Button>
                                <Button disabled={workingMessage === EXECUTING_PROMPT_WORKING_MESSAGE}
                                        onClick={event => setPromptusQVisible(true)} iconName="suggestions">Promptus
                                    Q</Button>
                                {!timeTravelVisible &&
                                    <Button variant={"link"} onClick={event => setTimeTravelVisible(true)}
                                            iconName="calendar">Show time
                                        travel</Button>}
                                {timeTravelVisible &&
                                    <Button variant={"link"} onClick={event => setTimeTravelVisible(false)}
                                            iconName="close">Hide time
                                        travel</Button>}
                            </SpaceBetween>
                        </div>
                    </Grid>
                    <PromptusQ working={workingMessage === PROMPTUSQ_WORKING_MESSAGE} visible={promptusQVisible}
                               onDismiss={() => {
                                   setOptimizedPrompt("")
                                   setPromptusQVisible(false)
                               }} onFetchSuggestion={description => {
                        promptusQ(description)
                    }
                    } onApplySuggestion={suggestion => {
                        const updatedPromptDetail = BaseUtils.setPromptToInference(promptDetail!, suggestion)
                        setPromptDetail({
                            ...promptDetail,
                            inference: updatedPromptDetail.inference
                        })
                        setOptimizedPrompt("")
                        setPromptusQVisible(false)
                    }} resultingPrompt={optimizedPrompt}></PromptusQ>
                    <PromptCompare onDismiss={() => {
                        setCompareVisible(false)
                    }} promptDetailLeft={promptDetailDto?.promptDetailEntity[0]}
                                   promptDetailRight={compareVersion}
                                   visible={compareVisible}></PromptCompare>
                </Container>
            </ContentLayout>} splitPanelOpen={timeTravelVisible} onSplitPanelPreferencesChange={event => {
            setTimeTravelPosition(event.detail.position)
        }} splitPanelPreferences={{
            position: timeTravelPosition,
        }} onSplitPanelToggle={event => setTimeTravelVisible(!timeTravelVisible)} splitPanel={
            <SplitPanel i18nStrings={{
                preferencesConfirm: "Ok",
                preferencesCancel: "Cancel",
                preferencesTitle: "Time travel preferences",
                preferencesPositionLabel: "Position",
                preferencesPositionDescription: "Choose where to show time travel",
                preferencesPositionSide: "Show time travel at the right side",
                preferencesPositionBottom: "Show time travel at the bottom",
            }} hidePreferencesButton={false} closeBehavior={"hide"} header={"Time-travel"}>
                <TimeTravel working={workingMessage === COMMENT_SAVE_WORKING_MESSAGE} compareVersion={version => {
                    let findIndex = promptDetailDto?.promptDetailEntity.findIndex(value => value.version === version);
                    if (findIndex !== undefined) {
                        setCompareVersion(promptDetailDto?.promptDetailEntity[findIndex] as PromptDetailEntity)
                        setCompareVisible(true)
                    }
                }} switchToVersion={version => {
                    let findIndex = promptDetailDto?.promptDetailEntity.findIndex(value => value.version === version);
                    if (findIndex !== undefined) {
                        selectedVersionChanged(findIndex)
                    }
                }} commentList={promptDetailDto?.promptEntity.comments}
                            onComment={comment => saveComment(comment)}></TimeTravel>
            </SplitPanel>
        }/>
    );
}

export default PromptusPrompt;