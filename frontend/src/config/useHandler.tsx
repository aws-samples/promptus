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

import React, {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {CognitoUser, CognitoUserPool, CognitoUserSession} from "amazon-cognito-identity-js";
import {JwtPayload} from "jwt-decode";

const Pool_Data = {
    UserPoolId: import.meta.env.VITE_USER_POOL_ID,
    ClientId: import.meta.env.VITE_CLIENT_ID,
};

interface IProviderProps {
    children: ReactNode;
}

interface IAuthenticationProperties {
    session?: CognitoUserSession;
    userPool: CognitoUserPool;
    loading: boolean;
    user: CognitoUser | null

    setSession(cognitoUserSession: CognitoUserSession): void;

    setUser(cognitoUser: CognitoUser): void;
}

const defaultContextValue: IAuthenticationProperties = {
    setSession(cognitoUserSession: CognitoUserSession): void {
    }, setUser(cognitoUser: CognitoUser): void {
    },
    loading: false,
    session: undefined,
    user: null,
    userPool: new CognitoUserPool(Pool_Data),
};

const TokenValidationContext = createContext<IAuthenticationProperties>(defaultContextValue);
const TokenValidationProvider = ({children}: IProviderProps) => {

    const [loading, setLoading] = useState(false);
    const [userPool, setUserPool] = useState(new CognitoUserPool(Pool_Data));
    const [session, setSession] = useState<CognitoUserSession>();
    const [user, setUser] = useState<CognitoUser | null>(userPool.getCurrentUser());

    type customJwtPayload = JwtPayload & {
        'cognito:groups': string[]
    };

    useEffect(() => {
        const validateToken = async () => {
            setLoading(true)
            if (userPool && userPool.getCurrentUser()) {
                userPool.getCurrentUser()?.getSession((error: null, session: CognitoUserSession) => {
                    if (session) {
                        setSession(session)
                    }
                    setLoading(false)
                })
            } else {
                setLoading(false)
            }
        };
        validateToken();
    }, []);

    return (
        <TokenValidationContext.Provider value={{userPool, session, user, loading, setSession, setUser}}>
            {children}
        </TokenValidationContext.Provider>
    );
};

export default TokenValidationProvider;

export const useTokenValidation = () => useContext(TokenValidationContext);