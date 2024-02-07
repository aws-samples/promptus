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
    Box,
    Button,
    Cards,
    ContentLayout,
    FormField,
    Header, Icon,
    Input,
    Modal,
    SpaceBetween, Spinner,
    Toggle
} from "@cloudscape-design/components";
import {NavLink, useParams} from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import {useTokenValidation} from "../config/useHandler";
import {PromptDto, PromptEntity} from "promptusCommon/Entities";

function PromptusProject() {
    const PUBLIC_PROMPT = "PUBLIC_PROMPT"
    const [loading, setLoading] = useState(false)
    const {session, user} = useTokenValidation()
    let {promptusProjectId} = useParams();
    const [promptList, setPromptList] = useState<PromptEntity[]>([])
    const [addPromptVisible, setAddPromptVisible] = useState(false)
    const [promptName, setPromptName] = useState("")
    const [promptDescription, setPromptDescription] = useState("")
    const [promptPublic, setPromptPublic] = useState(" ")
    const [errorMessage, setErrorMessage] = useState("")
    const [alertErrorMessage, setAlertErrorMessage] = useState("")
    const [promptToDelete, setPromptToDelete] = useState<PromptEntity>()
    const [deleteAlertVisible, setDeleteAlertVisible] = useState(false)
    const [workingMessage, setWorkingMessage] = useState("")

    function loadData() {
        setLoading(true)
        fetch(import.meta.env.VITE_API_URL + "/api/prompt?projectId=" + promptusProjectId, {
            method: "GET",
            headers: {
                Authorization: session!.getIdToken().getJwtToken()
            }
        })
            .then((response) => response.json())
            .then((projectList) => {
                setPromptList(projectList)
            })
            .catch((error) => setErrorMessage("Error loading prompts: " + error.message))
            .finally(() => setLoading(false));
    }

    function addPrompt() {
        setLoading(true)
        const promptDto = {
            name: promptName,
            description: promptDescription,
            publicPrompt: promptPublic
        } as PromptDto
        fetch(import.meta.env.VITE_API_URL + "/api/prompt?projectId=" + promptusProjectId, {
            method: "POST",
            headers: {
                Authorization: session!.getIdToken().getJwtToken()
            },
            body: JSON.stringify(promptDto)
        })
            .then(() => {
                hideAlert()
                loadData()
            })
            .catch((error) => {
                setAlertErrorMessage("Error adding prompt: " + error.message)
            }).finally(() => setLoading(false))
    }

    function hideAlert() {
        setErrorMessage("")
        setPromptName("")
        setPromptDescription("")
        setAddPromptVisible(false)
    }

    useEffect(() => {

        loadData()
    }, []);

    async function deletePrompt(prompt: PromptEntity) {
        setWorkingMessage("Deleting prompt")
        try {
            const response = await fetch(import.meta.env.VITE_API_URL + "/api/project/" + promptusProjectId + "/prompt/" + prompt.prompt.id, {
                method: "DELETE",
                headers: {
                    Authorization: session!.getIdToken().getJwtToken()
                }
            })
            if (response.status !== 200) {
                setErrorMessage("Error executing prompt: " + await response.text())
            }
            promptList.splice(promptList.indexOf(prompt),1)
        } catch (error: any) {
            setErrorMessage("Error deleting prompt")
        } finally {
            setWorkingMessage("")
        }
    }

    return (
        <AppLayout breadcrumbs={<Breadcrumb/>} toolsHide={true}
                   navigationHide={true} content={
            <ContentLayout header={
                <SpaceBetween direction={"vertical"} size="xl">
                    <Header variant="h1" actions={
                        <Button iconName="add-plus" onClick={event => setAddPromptVisible(true)}>Add prompt</Button>
                    }>
                        {workingMessage !== "" && <SpaceBetween size={"xs"} direction={"horizontal"}>
                            <Spinner/>
                            {workingMessage}
                        </SpaceBetween>}
                        {errorMessage && <Alert type={"error"}>{errorMessage}</Alert>}
                    </Header>
                </SpaceBetween>
            }>
                <Cards loading={loading} loadingText={"Loading prompts"} items={promptList}
                       cardDefinition={{
                           header: prompt => (
                               <NavLink to={"/project/" + promptusProjectId + "/prompt/" + prompt.prompt.id}
                                        className="text-link">
                                   <SpaceBetween size={"xs"} direction={"horizontal"}>
                                       {prompt.prompt.name}
                                       <Icon key={"visible" + prompt.entityId}
                                             name={prompt.publicEntity === "PUBLIC_PROMPT" ? "unlocked" : "lock-private"}/>
                                   </SpaceBetween>
                               </NavLink>
                           ),
                           sections: [
                               {
                                   id: "description",
                                   header: "Description",
                                   content: item => item.prompt.description
                               }, {
                                   id: "actions",
                                   header: "Actions",
                                   content: prompt => {
                                       return <SpaceBetween size={"s"} direction={"horizontal"}>
                                           {prompt.entityId.startsWith("#USER" + session!.getIdToken().decodePayload()["sub"]) ?
                                               <Button variant={"inline-link"} iconName={"remove"}
                                                       onClick={event => {
                                                           setPromptToDelete(prompt)
                                                           setDeleteAlertVisible(true)
                                                       }}>Delete
                                                   Prompt</Button> : <></>}
                                       </SpaceBetween>
                                   }
                               }
                           ]
                       }}
                ></Cards>
                <Modal onDismiss={event => setDeleteAlertVisible(false)} visible={deleteAlertVisible}
                       header="Delete prompt"
                       footer={
                           <Box float="right">
                               <SpaceBetween direction="horizontal" size="xs">
                                   <Button variant="link" onClick={() => {
                                       setDeleteAlertVisible(false)
                                   }}>Cancel</Button>
                                   <Button variant="primary" onClick={() => {
                                       setDeleteAlertVisible(false)
                                       deletePrompt(promptToDelete!)
                                   }}>Delete prompt</Button>
                               </SpaceBetween>
                           </Box>
                       }
                >
                    <SpaceBetween size="s">
                        {alertErrorMessage !== "" && <Alert type="error">
                            {alertErrorMessage}
                        </Alert>}
                        <p>Are you sure you want to delete the prompt <b>{promptToDelete?.prompt.name}</b>?</p>
                    </SpaceBetween>
                </Modal>
                <Modal

                    onDismiss={() => {
                        hideAlert();
                    }}
                    visible={addPromptVisible}
                    footer={
                        <Box float="right">
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button variant="link" onClick={() => {
                                    hideAlert();
                                }}>Cancel</Button>
                                <Button variant="primary" onClick={() => addPrompt()}>Add prompt</Button>
                            </SpaceBetween>
                        </Box>
                    }
                    header="Add new prompt"
                >
                    <SpaceBetween size="s">
                        {alertErrorMessage !== "" && <Alert type="error">
                            {alertErrorMessage}
                        </Alert>}
                        <FormField
                            label="Prompt name"
                        >
                            <Input value={promptName} onChange={event => setPromptName(event.detail.value)}/>
                        </FormField>
                        <FormField
                            label="Prompt description"
                        >
                            <Input value={promptDescription}
                                   onChange={event => setPromptDescription(event.detail.value)}/>
                        </FormField>
                        <FormField label="Public prompt">
                            <Toggle ariaLabel="Public prompt" checked={promptPublic === PUBLIC_PROMPT}
                                    onChange={() => {
                                        if (promptPublic === PUBLIC_PROMPT) {
                                            setPromptPublic(" ")
                                        } else {
                                            setPromptPublic(PUBLIC_PROMPT)
                                        }
                                    }}/>
                        </FormField>
                    </SpaceBetween>
                </Modal>
            </ContentLayout>}/>
    );
}

export default PromptusProject;