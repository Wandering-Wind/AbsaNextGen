import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function SubNav({type}){
    const location = useLocation();

    const trackLinks = [
        {name: "Property Path", path: "/tracks/property"},
        {name: "Global Investing", path: "/tracks/global-investing"},
        {name: "Travel", path: "/tracks/travel"},
    ];

    const studioLinks = [
        {name: "Rent vs Buy", path: "/studio/rent-vs-buy"},
        {name: "Car vs Invest", path: "/studio/car-vs-invest"},
        {name: "Offshore Portfolio", path: "/studio/offshore"},
    ];

    const links = type === "tracks" ? trackLinks : studioLinks;

    return(
        <div className="subnav">
            {links.map((link) => (
                <Link
                    key={link.path}
                    to={link.path}
                    className={location.pathname === link.path ? "active" : ""}
                >
                    {link.name}
                </Link>
            ))} 
        </div>
    )
}