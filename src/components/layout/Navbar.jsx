import React, { useState, useEffect, useRef, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { useNudges } from "../../context/NudgeContext";
import NudgeHistory from "../nudges/NudgeHistory";
import AuthContext from "../../context/AuthContext";

/* Derive initials from user*/
function getInitials(name = "") {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (parts[0]?.[0] ?? "?").toUpperCase();
}

function nameToHue(name = "") {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    /* Keep away from ABSA red (0°) ? offset into blue-green-purple range */
    return ((Math.abs(hash) % 240) + 160) % 360;
}

const GOAL_LABELS = {
    property:   "Property owner",
    retirement: "Retirement planner",
    travel:     "Travel saver",
    investment: "Global investor",
};

export default function Navbar() {
    const location                    = useLocation();
    const navigate                    = useNavigate();
    const { unreadCount, hasAlerts }  = useNudges();
    const { user, logout }            = useContext(AuthContext);

    const [historyOpen,  setHistoryOpen]  = useState(false);
    const [profileOpen,  setProfileOpen]  = useState(false);

    const profileRef = useRef(null);

    /* Close profile dropdown on outside click or Escape */
    useEffect(() => {
        if (!profileOpen) return;

        function handleClick(e) {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        }
        function handleKey(e) {
            if (e.key === "Escape") setProfileOpen(false);
        }

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown",   handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown",   handleKey);
        };
    }, [profileOpen]);

    function handleSignOut() {
        setProfileOpen(false);
        logout();
        navigate("/login");
    }

    const bellClass = [
        'nudge-bell-btn',
        unreadCount > 0  ? 'nudge-bell-btn--active'  : '',
        hasAlerts        ? 'nudge-bell-btn--pulsing'  : '',
    ].filter(Boolean).join(' ');

    const initials   = getInitials(user?.name);
    const hue        = nameToHue(user?.name ?? "");
    const avatarStyle = {
        background: `hsl(${hue}, 55%, 92%)`,
        borderColor: `hsl(${hue}, 45%, 78%)`,
        color:       `hsl(${hue}, 50%, 30%)`,
    };

    return (
        <div className="navbar">
            <div className="navbar-brand">
                <span className="navbar-logo">ABSA</span>
                <span className="navbar-product">NextGen Wealth Studio</span>
            </div>

            <div className="nav-links">
                <Link to="/home"            className={location.pathname === "/home"              ? "active" : ""}>Home</Link>
                <Link to="/dashboard"       className={location.pathname === "/dashboard"         ? "active" : ""}>Money Snapshot</Link>
                <Link to="/tracks"          className={location.pathname.startsWith("/tracks")    ? "active" : ""}>Strategy Tracks</Link>
                <Link to="/studio/rent-vs-buy" className={location.pathname.startsWith("/studio") ? "active" : ""}>Money Studio</Link>
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

                {/* Profile avatar + dropdown */}
                <div className="profile-menu" ref={profileRef}>
                    <button
                        className={`profile-btn profile-btn--initials${profileOpen ? " profile-btn--open" : ""}`}
                        style={avatarStyle}
                        onClick={() => setProfileOpen(o => !o)}
                        aria-label="Account menu"
                        aria-expanded={profileOpen}
                        aria-haspopup="menu"
                    >
                        {initials}
                    </button>

                    {profileOpen && (
                        <div className="profile-dropdown" role="menu" aria-label="Account menu">
                            {/* Identity block */}
                            <div className="profile-dropdown-identity">
                                <div className="profile-dropdown-avatar" style={avatarStyle}>
                                    {initials}
                                </div>
                                <div className="profile-dropdown-info">
                                    <span className="profile-dropdown-name">{user?.name ?? "Guest"}</span>
                                    <span className="profile-dropdown-email">{user?.email ?? ""}</span>
                                    {user?.primaryGoal && (
                                        <span className="profile-dropdown-goal-label">
                                            {GOAL_LABELS[user.primaryGoal] ?? user.primaryGoal}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="profile-dropdown-divider" role="separator" />

                            {/* Sign out */}
                            <button
                                className="profile-dropdown-signout"
                                onClick={handleSignOut}
                                role="menuitem"
                            >
                                <LogOut size={14} strokeWidth={1.75} />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Signal history dropdown panel */}
            {historyOpen && (
                <NudgeHistory onClose={() => setHistoryOpen(false)} />
            )}
        </div>
    );
}
