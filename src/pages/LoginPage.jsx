import "../styles/LoginPage.css";
import { useState, useContext } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import { useUserProfile } from "../context/UserProfileContext";

export default function LoginPage() {
    const [email,    setEmail]    = useState("")
    const [password, setPassword] = useState("")
    const [error,    setError]    = useState("")

    const { login }        = useContext(AuthContext)
    const { reloadProfile } = useUserProfile()
    const navigate          = useNavigate()
    const location          = useLocation()

    /* After login, go back to wherever the user was trying to reach,
       or default to /home */
    const from = location.state?.from?.pathname || "/home"

    function handleLogin(e) {
        e.preventDefault()
        const success = login(email, password)
        if (success) {
            /* Reload the user's saved financial profile into context */
            reloadProfile()
            navigate(from, { replace: true })
        } else {
            setError("Incorrect email or password.")
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">

                <div className="login-brand">
                    <span className="login-brand-logo">ABSA</span>
                    <span className="login-brand-name">NextGen Wealth Studio</span>
                </div>

                <h1>Welcome back</h1>
                <span className="login-subtitle">Sign in to pick up where you left off.</span>

                <form className="login-form" onSubmit={handleLogin}>
                    <div>
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="amy@example.com"
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <p className="error">{error}</p>}

                    <button type="submit">Sign in</button>
                </form>

                <div className="login-hint">
                    New to NextGen?{' '}
                    <Link to="/onboarding">Create your profile</Link>
                    {' '}- takes 3 minutes.
                </div>

            </div>
        </div>
    )
}
