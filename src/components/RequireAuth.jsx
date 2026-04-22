import React from "react";
import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AuthContext from "../context/AuthContext";

export default function RequireAuth({children}){
    const {authStatus} = useContext(AuthContext);
    const location = useLocation();

    if (authStatus === "unknown") {
        return <h1>Loading...</h1>
    }

    if (authStatus === "guest"){
        return <Navigate to="/" replace state={{ from: location }}/>;
    }

    return children;

};