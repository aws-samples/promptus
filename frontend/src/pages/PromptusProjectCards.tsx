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
    SpaceBetween,
    Toggle
} from "@cloudscape-design/components";
import {NavLink, useNavigate} from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import {useTokenValidation} from "../config/useHandler";
import {ProjectDto, PromptEntity} from "promptusCommon/Entities";


const PUBLIC_PROJECT = "PUBLIC_PROJECT";

function PromptusProjectCards() {
    const {session} = useTokenValidation()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [addProjectVisible, setAddProjectVisible] = useState(false)
    const [projectList, setProjectList] = useState<PromptEntity[]>([])
    const [projectName, setProjectName] = useState("")
    const [projectDescription, setProjectDescription] = useState("")
    const [projectPublic, setProjectPublic] = useState(" ")
    const [alertErrorMessage, setAlertErrorMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    async function loadData() {
        try {
            setLoading(true)
            const response = await fetch(process.env.REACT_APP_API_URL + "/api/project", {
                method: "GET",
                headers: {
                    Authorization: session!.getIdToken().getJwtToken()
                }
            })
            if (response.status === 200) {
                const projectList = await response.json() as PromptEntity[]
                setProjectList(projectList)
            } else if (response.status === 500) {
                setErrorMessage(await response.text())
            }
        } catch (error: any) {
            setErrorMessage("Error loading projects: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, []);

    function addProject() {
        setLoading(true)
        const project = {
            name: projectName,
            description: projectDescription,
            publicProject: projectPublic
        } as ProjectDto
        fetch(process.env.REACT_APP_API_URL + "/api/project", {
            method: "POST",
            headers: {
                Authorization: session!.getIdToken().getJwtToken()
            },
            body: JSON.stringify(project)
        })
            .then(() => {
                hideAlert()
                loadData()
            })
            .catch((error) => {
                setAlertErrorMessage("Error adding project: " + error.message)
            }).finally(() => setLoading(false))
    }

    function hideAlert() {
        setAlertErrorMessage("")
        setProjectName("")
        setProjectDescription("")
        setProjectPublic(" ")
        setAddProjectVisible(false)
    }

    return (
        <AppLayout breadcrumbs={
            <Breadcrumb/>
        } toolsHide={true} navigationHide={true} content={
            <ContentLayout header={
                <SpaceBetween direction={"vertical"} size="xl">
                    <Header variant="h1"
                            actions={<Button iconName="add-plus" onClick={() => setAddProjectVisible(true)}>Add
                                project</Button>}>
                        {errorMessage && <Alert type={"error"}>{errorMessage}</Alert>}
                        Projects
                    </Header>
                </SpaceBetween>
            }>
                <Cards loading={loading} loadingText="Loading projects" items={projectList}
                       cardDefinition={{
                           header: item => (
                               <NavLink to={"/project/" + item.project.id} className="text-link">
                                   <SpaceBetween size={"xs"} direction={"horizontal"}>
                                        {item.project.name}
                                       <Icon key={"visible"+item.entityId}
                                           name={item.publicEntity === "PUBLIC_PROJECT" ? "unlocked" : "lock-private"}/>
                                   </SpaceBetween>
                               </NavLink>
                           ),
                           sections: [
                               {
                                   id: "description",
                                   header: "Description",
                                   content: item => item.project.description
                               },
                           ]
                       }}
                />
                <Modal

                    onDismiss={() => {
                        hideAlert();
                    }}
                    visible={addProjectVisible}
                    footer={
                        <Box float="right">
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button variant="link" onClick={() => {
                                    hideAlert();
                                }}>Cancel</Button>
                                <Button variant="primary" onClick={() => addProject()}>Add project</Button>
                            </SpaceBetween>
                        </Box>
                    }
                    header="Add new project"
                >
                    <SpaceBetween size="s">
                        {alertErrorMessage !== "" && <Alert type="error">
                            {alertErrorMessage}
                        </Alert>}
                        <FormField
                            label="Project name"
                        >
                            <Input value={projectName} onChange={event => setProjectName(event.detail.value)}/>
                        </FormField>
                        <FormField
                            label="Project description"
                        >
                            <Input value={projectDescription}
                                   onChange={event => setProjectDescription(event.detail.value)}/>
                        </FormField>
                        <FormField label="Public project">
                            <Toggle ariaLabel="Public project" checked={projectPublic === PUBLIC_PROJECT}
                                    onChange={() => {
                                        if (projectPublic === PUBLIC_PROJECT) {
                                            setProjectPublic(" ")
                                        } else {
                                            setProjectPublic(PUBLIC_PROJECT)
                                        }
                                    }}/>
                        </FormField>
                    </SpaceBetween>
                </Modal>
            </ContentLayout>}/>
    );
}

export default PromptusProjectCards;