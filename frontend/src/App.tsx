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

import React from 'react';
import PromptusProjectCards from "./pages/PromptusProjectCards";
import PrivateRoute from "./components/PrivateRoute";
import {createBrowserRouter, RouterProvider,} from "react-router-dom";
import {useTokenValidation} from "./config/useHandler";
import "@cloudscape-design/global-styles/index.css"
import {TopNavigation, TopNavigationProps} from "@cloudscape-design/components";
import PromptusPrompt from "./pages/PromptusPrompt";
import PromptusProject from "./pages/PromptusProject";
import {BreadcrumbData} from "./components/Breadcrumb";


export default function App() {
    const tokenValidation = useTokenValidation();

    const loggedInUtilities = [
        {
            type: "menu-dropdown",
            text: tokenValidation.user?.getUsername(),
            title: tokenValidation.user?.getUsername(),
            iconName: "user-profile",
            onItemClick: event => {
                if (event.detail.id === "logout") {
                    handleLogout()
                }
            },
            items: [
                {
                    id: "logout",
                    text: "Logout",
                    external: false
                }
            ]
        }] as TopNavigationProps.Utility[]

    const router = createBrowserRouter([
            {
                path: "/",
                handle: {
                    crumb: (data: any) => {
                        return {text: "Home", href: "/"}
                    },
                },
                children: [
                    {
                        element: <PromptusProjectCards/>,
                        index: true
                    },
                    {
                        path: "/project/:promptusProjectId",
                        handle: {
                            crumb: (data: BreadcrumbData) => {
                                return {text: "Project", href: "/project/" + data.projectId}
                            },
                        },
                        children: [
                            {
                                element: <PromptusProject/>,
                                index: true
                            },
                            {
                                path: "prompt/:promptusPromptId",
                                element: <PromptusPrompt/>,
                                handle: {
                                    crumb: (data: BreadcrumbData) => {
                                        return {
                                            text: "Prompt",
                                            href: "/project/" + data.projectId + "/promptusPrompt/" + data.promptId
                                        }
                                    },
                                },
                            }
                        ]
                    },

                ]
            }
        ])
    ;

    const handleLogout = () => {
        tokenValidation.user?.signOut(() => {
            window.location.assign("/")
        })
    }

    return (
        <>
            <TopNavigation
                identity={{
                    href: "/",
                    title: "Promptus",
                    logo: {
                        src: "/android-chrome-192x192.png",
                        alt: "Promptus"
                    }
                }}

                utilities={useTokenValidation().user ? loggedInUtilities : []}
            />
            <PrivateRoute>
                <RouterProvider router={router}></RouterProvider>
            </PrivateRoute>
        </>
    );
}