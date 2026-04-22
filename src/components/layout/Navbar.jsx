import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar(){
    const location = useLocation();

    return(
        <div className="navbar">
            <button className="profile-btn">👤</button>
             
                <div className="nav-links">
                    <Link 
                        to="/home" 
                        className={location.pathname === "/home" ? "active" : ""}
                    >
                        Home
                        {/*Should I name this home or AbsaNextGen */}
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
                        Strategy Track
                    </Link>

                    <Link 
                        to="/studio/rent-vs-buy" 
                        className={location.pathname.startsWith("/studio") ? "active" : ""}
                    >
                        Money Studio
                    </Link>
                </div>

                <div className="navbar-brand">
                    <span className="navbar-logo">ABSA</span>
                    <span className="navbar-product">NextGen</span>
                </div>
            
        </div>
    )
}