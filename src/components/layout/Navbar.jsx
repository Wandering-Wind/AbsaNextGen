import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar(){
    const location = useLocation();

    return(
        <div className="navbar">
            <div className="navbar-brand">
                <span className="navbar-logo">ABSA</span>
                <span className="navbar-product">NextGen Wealth Studio</span>
            </div>

            <div className="nav-links">
                <Link
                    to="/home"
                    className={location.pathname === "/home" ? "active" : ""}
                >
                    Home
                </Link>

                <Link
                    to="/dashboard"
                    className={location.pathname === "/dashboard" ? "active" : ""}
                >
                    Money Snapshot
                </Link>

                <Link
                    to="/tracks/property"
                    className={location.pathname.startsWith("/tracks") ? "active" : ""}
                >
                    Strategy Tracks
                </Link>

                <Link
                    to="/studio/rent-vs-buy"
                    className={location.pathname.startsWith("/studio") ? "active" : ""}
                >
                    Money Studio
                </Link>
            </div>

            <button className="profile-btn" aria-label="Profile">👤</button>
        </div>
    )
}
