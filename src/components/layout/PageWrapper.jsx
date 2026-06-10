import React, { useState, useEffect } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import SideNav from "./SideNav";
import SubNav from "./SubNav";
import NudgeStack from "../nudges/NudgeStack";
import absaLogo from "../../assets/images/absa_logo.png";
import "../../styles/components/Nudges.css";

export default function PageWrapper() {
    const location = useLocation();
    const [navOpen, setNavOpen] = useState(false);

    /* Close drawer on route change */
    useEffect(() => { setNavOpen(false); }, [location.pathname]);

    /* Lock body scroll when mobile nav is open */
    useEffect(() => {
        document.body.style.overflow = navOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [navOpen]);

    return (
        <div className="app-container">
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* Overlay backdrop for mobile only */}
            {navOpen && (
                <div className="nav-overlay" onClick={() => setNavOpen(false)} aria-hidden="true" />
            )}

            <SideNav isOpen={navOpen} onClose={() => setNavOpen(false)} />

            <div className="main-area">
                {/* Mobile header bar with hidden on desktop */}
                <header className="mobile-header">
                    <button
                        className="burger-btn"
                        onClick={() => setNavOpen(o => !o)}
                        aria-label={navOpen ? "Close menu" : "Open menu"}
                        aria-expanded={navOpen}
                    >
                        {navOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
                    </button>

                    <Link to="/home" className="mobile-header-brand">
                        <div className="mobile-header-logo-badge">
                            <img src={absaLogo} alt="ABSA" />
                        </div>
                        <span className="mobile-header-name">NextGen</span>
                    </Link>
                </header>

                {location.pathname.startsWith("/tracks") && (
                    <div className="subnav-wrapper"><SubNav type="tracks" /></div>
                )}
                {location.pathname.startsWith("/studio") && (
                    <div className="subnav-wrapper"><SubNav type="studio" /></div>
                )}

                <main id="main-content" className="page-container">
                    <Outlet />
                </main>

                <NudgeStack />
            </div>
        </div>
    );
}
