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

import {useMatches, useParams} from "react-router-dom";
import {UIMatch} from "@remix-run/router";
import {BreadcrumbGroup, BreadcrumbGroupProps} from "@cloudscape-design/components";
import React from "react";

export interface BreadcrumbData {
    projectId: string,
    promptId: string
}

{/*Provides the breadcrumb for navigation inside Promptus*/
}

function Breadcrumb() {
    let matches: UIMatch<any, any>[] = useMatches();
    let {promptusProjectId, promptusPromptId} = useParams();
    let crumbs = matches
        // first get rid of any matches that don't have handle and crumb
        .filter((match) => Boolean(match.handle?.crumb))
        // now map them into an array of elements, passing the loader
        // data to each one
        .map((match) => {
            return match.handle.crumb({
                projectId: promptusProjectId,
                promptId: promptusPromptId
            } as BreadcrumbData) as BreadcrumbGroupProps.Item
        });

    return (
        <BreadcrumbGroup items={crumbs}></BreadcrumbGroup>
    );
}

export default Breadcrumb;