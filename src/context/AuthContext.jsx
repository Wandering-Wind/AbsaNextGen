import { createContext, useState, useEffect } from "react";

const AuthContext = createContext()

export function AuthProvider ({children}) {
    const [authStatus, setAuthStatus] = useState("unknown"); 
    const [user, setUser] = useState(null);

    useEffect(() => {
        const isAuthed = localStorage.getItem("isAuthed") === "true";
        const username = localStorage.getItem("username");

        if (isAuthed && username) {
            setAuthStatus("authed");
            setUser({username });
        } else {
            setAuthStatus("guest");
        }
    }, [])

    function login(username, password) {
        if (username && password.length >= 4) {
            setAuthStatus("authed");
            setUser({username});

            localStorage.setItem("isAuthed", "true");
            localStorage.setItem("username", username);

            return true;
        }
        return false;
    }

    function logout(){
        setAuthStatus("guest");
        setUser(null);
        localStorage.clear();
    }

    return(
        <AuthContext.Provider value={{login, logout, authStatus, user}}>
            {children}
        </AuthContext.Provider>
    )

}

export default AuthContext;

