import { createContext, useState, useEffect } from "react";

const AuthContext = createContext()

/* localStorage keys - keeping them namespaced so they don't clash
   with anything else the browser might store */
const USERS_KEY   = 'absa_users'         /* object keyed by email → user data */
const CURRENT_KEY = 'absa_current_email' /* email of whoever is logged in right now */

export function AuthProvider({ children }) {
    /* authStatus: 'unknown' while we check storage, 'authed', or 'guest' */
    const [authStatus, setAuthStatus] = useState("unknown");

    /* user holds the non-financial identity: name, email, primaryGoal */
    const [user, setUser] = useState(null);

    /* On mount: check if someone is still logged in from a previous session */
    useEffect(() => {
        /* Clean up keys from the old auth system so there's no leftover data */
        localStorage.removeItem('isAuthed');
        localStorage.removeItem('username');

        const email    = localStorage.getItem(CURRENT_KEY);
        const users    = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
        const userData = users[email];

        if (email && userData) {
            setAuthStatus("authed");
            setUser({ name: userData.name, email: userData.email, primaryGoal: userData.primaryGoal });
        } else {
            setAuthStatus("guest");
        }
    }, []);

    /* register - called at the end of the onboarding wizard.
       Receives the full new-user object and writes it to localStorage.
       Returns { success: true } or { success: false, error: '...' } */
    function register({ name, email, password, profile, primaryGoal }) {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');

        /* Don't allow duplicate accounts */
        if (users[email]) {
            return { success: false, error: 'An account with this email already exists.' };
        }

        /* Write the new user record */
        users[email] = { name, email, password, primaryGoal, profile, createdAt: new Date().toISOString() };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(CURRENT_KEY, email);

        setAuthStatus("authed");
        setUser({ name, email, primaryGoal });
        return { success: true };
    }

    /* login - checks email + password against stored accounts.
       Returns true on success, false on failure */
    function login(email, password) {
        const users    = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
        const userData = users[email];

        /* Wrong email or wrong password - same error message intentionally
           (don't tell someone which part was wrong, that's a security practice) */
        if (!userData || userData.password !== password) return false;

        localStorage.setItem(CURRENT_KEY, email);
        setAuthStatus("authed");
        setUser({ name: userData.name, email: userData.email, primaryGoal: userData.primaryGoal });
        return true;
    }

    /* logout - clears session but keeps the user's account data in storage
       so they can log back in */
    function logout() {
        setAuthStatus("guest");
        setUser(null);
        localStorage.removeItem(CURRENT_KEY);
    }

    return (
        <AuthContext.Provider value={{ login, logout, register, authStatus, user }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
