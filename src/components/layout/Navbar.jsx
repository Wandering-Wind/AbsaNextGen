import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNudges } from "../../context/NudgeContext";
import NudgeHistory from "../nudges/NudgeHistory";

export default function Navbar() {
    const location               = useLocation();
    const { unreadCount, hasAlerts } = useNudges();
    const [historyOpen, setHistoryOpen] = useState(false);

    /* Bell button class names - responds to signal count and type */
    const bellClass = [
        'nudge-bell-btn',
        unreadCount > 0  ? 'nudge-bell-btn--active'  : '',
        hasAlerts        ? 'nudge-bell-btn--pulsing'  : '',
    ].filter(Boolean).join(' ')

    return (
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
                    to="/tracks"
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

            <div className="navbar-actions">
                {/* Financial signals bell */}
                <button
                    className={bellClass}
                    onClick={() => setHistoryOpen(o => !o)}
                    aria-label={
                        unreadCount > 0
                            ? `${unreadCount} active financial signal${unreadCount > 1 ? 's' : ''}`
                            : 'Financial signals'
                    }
                    aria-expanded={historyOpen}
                    aria-haspopup="dialog"
                >
                    <Bell size={16} strokeWidth={1.75} />
                    {unreadCount > 0 && (
                        <span className="nudge-bell-badge" aria-hidden="true">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                <button className="profile-btn" aria-label="Profile">
                    &#128100;
                </button>
            </div>

            {/* Signal history dropdown panel */}
            {historyOpen && (
                <NudgeHistory onClose={() => setHistoryOpen(false)} />
            )}
        </div>
    )
}
