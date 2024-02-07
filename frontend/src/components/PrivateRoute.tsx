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

import React, {useState} from "react";
import {useTokenValidation} from "../config/useHandler";
import {
    AuthenticationDetails,
    CognitoUser,
    CognitoUserAttribute,
    CognitoUserSession,
    ICognitoUserAttributeData
} from "amazon-cognito-identity-js";
import {
    Alert,
    AppLayout,
    Button,
    Container,
    ContentLayout,
    Form,
    FormField,
    Grid,
    Header,
    Input,
    SpaceBetween,
    Spinner
} from "@cloudscape-design/components";
import {InputProps} from "@cloudscape-design/components/input/interfaces";

type Props = {
    children?: React.ReactNode;
};

{/*
This component checks if the user is authenticated. If that's not the case it displays the LoginPage.
*/
}

const PrivateRoute: React.FC<Props> = ({children}) => {
    const {user, userPool, loading, session, setSession, setUser} = useTokenValidation();
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [newPasswordConfirm, setNewPasswordConfirm] = useState("")
    const [oldPassword, setOldPassword] = useState("")
    const [email, setEmail] = useState("")
    const [changePassword, setChangePassword] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | undefined>()
    const passwordConfirmRef = React.createRef<InputProps.Ref>();
    const emailRef = React.createRef<InputProps.Ref>();
    const passwordRef = React.createRef<InputProps.Ref>();
    const [signup, setSignup] = useState(false)
    const [confirmMail, setConfirmMail] = useState(false)
    const [confirmCode, setConfirmCode] = useState("")

    const handlePasswordChange = (e: Event) => {
        e.preventDefault();
        setErrorMessage("")
        if (newPassword !== newPasswordConfirm) {
            setErrorMessage("Passwords do not match")
            return
        }
        let cognitoUser = createCognitoUser();
        cognitoUser.completeNewPasswordChallenge(newPassword, [], {
            onSuccess(session) {
                setSession(session)
                setUser(cognitoUser)
                window.location.href = "/"
            },
            onFailure(err: Error) {
                setErrorMessage(err.message)
            }
        },)
        user?.changePassword(oldPassword, newPassword, (err, result) => {
            if (err) {
                setErrorMessage(err.message)
            } else {
                window.location.href = "/"
            }
        });
    }

    function createAuthDetails() {
        const authenticationData = {
            Username: username,
            Password: password
        };
        return new AuthenticationDetails(authenticationData);
    }

    function createCognitoUser() {
        const userData = {
            Username: username,
            Pool: userPool
        };
        let cognitoUserTemp = new CognitoUser(userData);
        cognitoUserTemp.setAuthenticationFlowType("USER_PASSWORD_AUTH")
        return cognitoUserTemp;
    }

    const handleLogin = (e: Event) => {
        setErrorMessage("")
        e.preventDefault();
        const authDetails = createAuthDetails();
        let cognitoUserTemp = createCognitoUser();
        cognitoUserTemp!.authenticateUser(authDetails, {
            onSuccess: function (session: CognitoUserSession) {
                setSession(session)
                setUser(cognitoUserTemp!)
                window.location.href = "/"
            },
            onFailure(err) {
                if (err.code === "UserNotConfirmedException") {
                    setConfirmMail(true)
                }
                const {message} = err;
                setErrorMessage(message)
            },
            newPasswordRequired() {
                setChangePassword(true)
            }
        });
        setChangePassword(false)
    }

    function handleSignup() {
        userPool.signUp(username, newPassword, new Array(new CognitoUserAttribute({
            Name: "email",
            Value: email
        } as ICognitoUserAttributeData)), [], (err, result) => {
            if (err) {
                setErrorMessage(err.message)
            } else {
                setConfirmMail(true)
                setSignup(false)
                setPassword("")
                setNewPassword("")
                setNewPasswordConfirm("")
            }
        }, {})

    }

    function handleConfirmMail() {
        createCognitoUser().confirmRegistration(confirmCode, false, err => {
            if (err) {
                setErrorMessage(err.message)
            } else {
                setConfirmMail(false)
            }
        }, {})
    }

    if (loading) {
        return (
            <AppLayout toolsHide={true} navigationHide={true} content={
                <ContentLayout header={
                    <SpaceBetween direction={"vertical"} size="xl">
                        <Header variant="h1">
                            Checking authentication status
                        </Header>
                        {errorMessage && <Alert type={"error"}>{errorMessage}</Alert>}
                    </SpaceBetween>
                }>
                    <Container>
                        <Spinner/>
                    </Container>
                </ContentLayout>}/>
        );
    } else {
        if (user && session) {
            return <>{children}</>
        } else {
            if (confirmMail) {
                return (
                    <AppLayout toolsHide={true} navigationHide={true} content={
                        <ContentLayout header={
                            <SpaceBetween direction={"vertical"} size="xl">
                                <Header variant="h1">
                                    Confirm mail address
                                </Header>
                                {errorMessage && <Alert type={"error"}>{errorMessage}</Alert>}
                            </SpaceBetween>
                        }>
                            <Form
                                actions={
                                    <SpaceBetween direction="horizontal" size="xs">
                                        <Button variant="primary" onClick={handleConfirmMail}
                                                disabled={confirmCode === ""}>Send verification code</Button>
                                    </SpaceBetween>
                                }
                            >
                                <Container>
                                    <SpaceBetween direction="vertical" size="l">
                                        <Grid
                                            gridDefinition={[
                                                {colspan: {default: 12}},
                                            ]}
                                        >
                                            <div>
                                                <FormField stretch={true} label="E-Mail verification code">
                                                    <Input value={confirmCode}
                                                           onKeyDown={event => {
                                                               if (event.detail.key === "Enter") {
                                                                   if (confirmCode !== "") {
                                                                       handleConfirmMail()
                                                                   }
                                                               }
                                                           }}
                                                           onChange={event => setConfirmCode(event.detail.value)}/>
                                                </FormField>
                                            </div>
                                        </Grid>
                                    </SpaceBetween>
                                </Container>
                            </Form>
                        </ContentLayout>}/>
                );
            }
            if (signup) {
                return (<AppLayout toolsHide={true} navigationHide={true} content={
                    <ContentLayout header={
                        <SpaceBetween direction={"vertical"} size="xl">
                            <Header variant="h1">
                                Signup
                            </Header>
                            {errorMessage && <Alert type={"error"}>{errorMessage}</Alert>}
                        </SpaceBetween>
                    }>
                        <Form
                            actions={
                                <SpaceBetween direction="horizontal" size="xs">
                                    <Button variant="primary" onClick={handleSignup}
                                            disabled={newPassword !== newPasswordConfirm || email === "" || username === "" || newPassword === ""}>Signup</Button>
                                </SpaceBetween>
                            }
                        >
                            <Container>
                                <SpaceBetween direction="vertical" size="l">
                                    <Grid
                                        gridDefinition={[
                                            {colspan: {default: 12}},
                                            {colspan: {default: 12}},
                                            {colspan: {default: 12}},
                                            {colspan: {default: 12}},
                                        ]}
                                    >
                                        <div>
                                            <FormField stretch={true} label="Username">
                                                <Input value={username}
                                                       onKeyDown={event => {
                                                           if (event.detail.key === "Enter") {
                                                               passwordRef.current?.focus()
                                                           }
                                                       }}
                                                       onChange={event => setUsername(event.detail.value)}/>
                                            </FormField>
                                        </div>
                                        <div>
                                            <FormField stretch={true} label="Password">
                                                <Input ref={passwordRef} type={"password"} value={newPassword}
                                                       onKeyDown={event => {
                                                           if (event.detail.key === "Enter") {
                                                               passwordConfirmRef.current?.focus()
                                                           }
                                                       }
                                                       } onChange={event => setNewPassword(event.detail.value)}/>
                                            </FormField>
                                        </div>
                                        <div>
                                            <FormField stretch={true} label="Confirm password">
                                                <Input ref={passwordConfirmRef} type={"password"}
                                                       value={newPasswordConfirm}
                                                       onKeyDown={event => {
                                                           if (event.detail.key === "Enter") {
                                                               emailRef.current?.focus()
                                                           }
                                                       }
                                                       } onChange={event => setNewPasswordConfirm(event.detail.value)}/>
                                            </FormField>
                                        </div>
                                        <div>
                                            <FormField stretch={true} label="E-Mail">
                                                <Input ref={emailRef} type={"email"} value={email}
                                                       onKeyDown={event => {
                                                           if (event.detail.key === "Enter" && email !== "") {
                                                               if (newPassword === newPasswordConfirm && email !== "" && username !== "" && newPassword !== "") {
                                                                   handleSignup()
                                                               }

                                                           }
                                                       }
                                                       } onChange={event => setEmail(event.detail.value)}/>
                                            </FormField>
                                        </div>
                                    </Grid>
                                </SpaceBetween>
                            </Container>
                        </Form>
                    </ContentLayout>
                }/>)
            } else if (!changePassword) {
                return (
                    <AppLayout toolsHide={true} navigationHide={true} content={
                        <ContentLayout header={
                            <SpaceBetween direction={"vertical"} size="xl">
                                <Header variant="h1">
                                    Login
                                </Header>
                                {errorMessage && <Alert type={"error"}>{errorMessage}</Alert>}
                            </SpaceBetween>
                        }>
                            <Form
                                actions={
                                    <SpaceBetween direction="horizontal" size="xs">
                                        <Button variant="primary" onClick={handleLogin}>Login</Button>
                                    </SpaceBetween>
                                }
                            >
                                <Container>
                                    <SpaceBetween direction="vertical" size="l">
                                        <Grid
                                            gridDefinition={[
                                                {colspan: {default: 12}},
                                                {colspan: {default: 12}},
                                                {colspan: {default: 12}}
                                            ]}
                                        >
                                            <div>
                                                <FormField stretch={true} label="Username">
                                                    <Input value={username}
                                                           onChange={event => setUsername(event.detail.value)}/>
                                                </FormField>
                                            </div>
                                            <div>
                                                <FormField stretch={true} label="Password">
                                                    <Input type={"password"} value={password}
                                                           onKeyDown={event => {
                                                               if (event.detail.key === "Enter") {
                                                                   handleLogin(event)
                                                               }
                                                           }
                                                           } onChange={event => setPassword(event.detail.value)}/>
                                                </FormField>
                                            </div>
                                            <div>
                                                <Button variant={"inline-link"}
                                                        onClick={event => setSignup(true)}>Signup</Button>
                                            </div>
                                        </Grid>
                                    </SpaceBetween>
                                </Container>
                            </Form>
                        </ContentLayout>
                    }/>
                );
            } else {
                return (<AppLayout toolsHide={true} navigationHide={true} content={
                    <ContentLayout header={
                        <SpaceBetween direction={"vertical"} size="xl">
                            <Header variant="h1">
                                Change password
                            </Header>
                            {errorMessage && <Alert type={"error"}>{errorMessage}</Alert>}
                        </SpaceBetween>
                    }>
                        <Form
                            actions={
                                <SpaceBetween direction="horizontal" size="xs">
                                    <Button variant="primary" onClick={handlePasswordChange}>Change password</Button>
                                </SpaceBetween>
                            }
                        >
                            <Container>
                                <SpaceBetween direction="vertical" size="l">
                                    <Grid
                                        gridDefinition={[
                                            {colspan: {default: 12}},
                                            {colspan: {default: 12}},
                                            {colspan: {default: 12}},
                                        ]}
                                    >
                                        <div>
                                            <FormField stretch={true} label="Username">
                                                <Input readOnly={true} value={username}
                                                       onChange={event => setUsername(event.detail.value)}/>
                                            </FormField>
                                        </div>
                                        <div>
                                            <FormField stretch={true} label="New password">
                                                <Input type={"password"} value={newPassword}
                                                       onKeyDown={event => {
                                                           if (event.detail.key === "Enter") {
                                                               passwordConfirmRef.current?.focus()
                                                           }
                                                       }
                                                       } onChange={event => setNewPassword(event.detail.value)}/>
                                            </FormField>
                                        </div>
                                        <div>
                                            <FormField stretch={true} label="New password confirm">
                                                <Input ref={passwordConfirmRef} type={"password"}
                                                       value={newPasswordConfirm}
                                                       onKeyDown={event => {
                                                           if (event.detail.key === "Enter") {
                                                               handlePasswordChange(event)
                                                           }
                                                       }
                                                       } onChange={event => setNewPasswordConfirm(event.detail.value)}/>
                                            </FormField>
                                        </div>
                                    </Grid>
                                </SpaceBetween>
                            </Container>
                        </Form>
                    </ContentLayout>
                }/>)
            }
        }
    }
}

export default PrivateRoute;