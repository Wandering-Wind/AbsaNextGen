import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import SubNav from "./SubNav";


export default function PageWrapper(){
    const location = useLocation();

    return(
        <div className="app-container">
            <div className="navbar-wrapper">
                <Navbar/>
            </div>

            {/* <div className="below-navbar"> */}

                {location.pathname.startsWith("/tracks") && (<div className="subnav-wrapper"><SubNav type="tracks"/></div>)}

                {location.pathname.startsWith("/studio") && (<div className="subnav-wrapper"><SubNav type="studio"/></div>)}

                <div className="page-container">
                    <Outlet/>
                </div>
            {/* </div> */}

        </div>
    )
}