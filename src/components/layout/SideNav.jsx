import React, { useState, useEffect, useRef, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Home, BarChart2, Map, FlaskConical } from "lucide-react";
import { useNudges } from "../../context/NudgeContext";
import NudgeHistory from "../nudges/NudgeHistory";
import AuthContext from "../../context/AuthContext";
import absaLogo from "../../assets/images/absa_logo.png";

function getInitials(name = "") {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (parts[0]?.[0] ?? "?").toUpperCase();
}

function nameToHue(name = "") {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return ((Math.abs(hash) % 240) + 160) % 360;
}

const GOAL_LABELS = {
    property:   "Property owner",
    retirement: "Retirement planner",
    travel:     "Travel saver",
    investment: "Global investor",
};

const NAV_ITEMS = [
    { to: "/home",               label: "Home",            Icon: Home,         exact: true  },
    { to: "/dashboard",          label: "Money Snapshot",  Icon: BarChart2,    exact: true  },
    { to: "/tracks",             label: "Strategy Tracks", Icon: Map,          prefix: "/tracks"  },
    { to: "/studio/rent-vs-buy", label: "Money Studio",    Icon: FlaskConical, prefix: "/studio" },
];

export default function SideNav({ isOpen, onClose }) {
    const location  = useLocation();
    const navigate  = useNavigate();
    const { unreadCount, hasAlerts } = useNudges();
    const { user, logout }           = useContext(AuthContext);

    const [historyOpen, setHistoryOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => {
        if (!profileOpen) return;
        function handleClick(e) {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
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

    /* Close nav drawer on link click (mobile) */
    function handleNavClick() {
        if (onClose) onClose();
    }

    const bellClass = [
        "nudge-bell-btn",
        unreadCount > 0 ? "nudge-bell-btn--active"  : "",
        hasAlerts       ? "nudge-bell-btn--pulsing" : "",
    ].filter(Boolean).join(" ");

    const initials    = getInitials(user?.name);
    const hue         = nameToHue(user?.name ?? "");
    const avatarStyle = {
        background:  `hsl(${hue}, 55%, 92%)`,
        borderColor: `hsl(${hue}, 45%, 78%)`,
        color:       `hsl(${hue}, 50%, 30%)`,
    };

    function isActive({ to, exact, prefix }) {
        if (exact)  return location.pathname === to;
        if (prefix) return location.pathname.startsWith(prefix);
        return location.pathname === to;
    }

    return (
        <aside className={`side-nav${isOpen ? " side-nav--open" : ""}`}>
            {/* Brand */}
            <div className="side-nav-brand">
                <Link to="/home" className="side-nav-brand-link" onClick={handleNavClick}>
                    <div className="side-nav-logo-badge">
                        <img src={absaLogo} alt="ABSA" className="side-nav-logo-img" />
                    </div>
                    <div className="side-nav-brand-text">
                        <span className="side-nav-logo">ABSA</span>
                        <span className="side-nav-product">NextGen</span>
                    </div>
                </Link>
            </div>

            {/* Nav links */}
            <p className="side-nav-section-label">Navigation</p>
            <nav className="side-nav-links">
                {NAV_ITEMS.map(item => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={isActive(item) ? "active" : ""}
                        onClick={handleNavClick}
                    >
                        <item.Icon size={15} strokeWidth={1.75} />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Footer: bell + profile */}
            <div className="side-nav-footer">
                <button
                    className={bellClass}
                    onClick={() => setHistoryOpen(o => !o)}
                    aria-label={unreadCount > 0 ? `${unreadCount} financial signals` : "Financial signals"}
                    aria-expanded={historyOpen}
                >
                    <Bell size={16} strokeWidth={1.75} />
                    {unreadCount > 0 && (
                        <span className="nudge-bell-badge" aria-hidden="true">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>

                <div className="profile-menu" ref={profileRef}>
                    <button
                        className={`profile-btn profile-btn--initials${profileOpen ? " profile-btn--open" : ""}`}
                        style={avatarStyle}
                        onClick={() => setProfileOpen(o => !o)}
                        aria-label="Account menu"
                        aria-expanded={profileOpen}
                    >
                        {initials}
                    </button>

                    {profileOpen && (
                        <div className="profile-dropdown side-nav-profile-dropdown" role="menu">
                            <div className="profile-dropdown-identity">
                                <div className="profile-dropdown-avatar" style={avatarStyle}>{initials}</div>
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
                            <button className="profile-dropdown-signout" onClick={handleSignOut} role="menuitem">
                                <LogOut size={14} strokeWidth={1.75} />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {historyOpen && <NudgeHistory onClose={() => setHistoryOpen(false)} />}
        </aside>
    );
}
