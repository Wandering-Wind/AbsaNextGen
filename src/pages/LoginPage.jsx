import React from "react";
import "../styles/LoginPage.css";
import { useState, useContext } from "react";
import AuthContext from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

export default function LoginPage(){
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
 
    const {login} = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/home";

    function handleLogin(e){
        e.preventDefault();

         const success = login(username, password);

         if(success){
            navigate (from, {replace: true});
         }
         else{
            setError("Invalid username or password");
         }
    }

    return(
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">
      <span className="login-brand-logo">ABSA</span>
      <span className="login-brand-name">NextGen</span>
    </div>

            <h1>Welcome back</h1>
            <p className="login-subtitle">Sign in to access your financial snapshot. (Username can be anything and password should be MORE than 4 letters)</p>
            <form className="login-form" onSubmit={handleLogin}>
                <div>
                    <label>Username</label>
                    <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div>
                    <label>Password</label>
                    <input type="text" value={password} onChange={(e)=> setPassword(e.target.value)}/>
                </div>

                {error && <p className="error">{error}</p>}

                <button type="submit">Login</button>

            </form>
            </div>
        </div>
    )
}