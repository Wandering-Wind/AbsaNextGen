import "../styles/pages/LoginPage.css";
import { useState, useContext } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthContext from "../context/AuthContext";
import { useUserProfile } from "../context/UserProfileContext";
import Icon from "../components/Icons";
import absaLogo from "../assets/images/absa_logo.png";

export default function LoginPage() {
    const [email,        setEmail]        = useState("")
    const [password,     setPassword]     = useState("")
    const [error,        setError]        = useState("")
    const [showPassword, setShowPassword] = useState(false)

    const { login }         = useContext(AuthContext)
    const { reloadProfile } = useUserProfile()
    const navigate          = useNavigate()
    const location          = useLocation()

    const from = location.state?.from?.pathname || "/home"

    function handleLogin(e) {
        e.preventDefault()
        const success = login(email, password)
        if (success) {
            reloadProfile()
            navigate(from, { replace: true })
        } else {
            setError("Incorrect email or password.")
        }
    }

    return (
        <div className="login-shell">

            {/* Left panel — same brand treatment as onboarding */}
            <div className="login-left">
                <div className="login-left-inner">
                    <div className="login-brand">
                        <img src={absaLogo} alt="ABSA" className="login-brand-img" />
                        <span className="login-brand-logo">ABSA</span>
                        <span className="login-brand-name">NextGen</span>
                    </div>
                    <h2 className="login-left-headline">
                        Welcome<br/>back.
                    </h2>
                    <p className="login-left-body">
                        A financial planning tool built for high-earning young South Africans.
                        Understand your money, simulate your decisions, and build toward real goals.
                    </p>
                    <ul className="login-left-list">
                        <li><Icon name="snapshot" size={16}/> Real take-home pay after PAYE &amp; RA</li>
                        <li><Icon name="tracks"   size={16}/> Personalised 5-year strategy tracks</li>
                        <li><Icon name="studio"   size={16}/> Live financial simulations</li>
                    </ul>
                </div>
            </div>

            {/* Right panel — sign in form */}
            <div className="login-right">
                <div className="login-form-wrap">

                    <div className="login-welcome">
                        <p className="login-welcome-eyebrow">Welcome back</p>
                        <h1 className="login-heading">Your story<br/>matters.</h1>
                        <p className="login-subtitle">Sign in to continue building toward your goals.</p>
                    </div>

                    <div className="login-divider" />

                    <form className="login-form" onSubmit={handleLogin}>
                        <div className="login-field">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError("") }}
                                placeholder="name@example.com"
                                autoComplete="email"
                            />
                        </div>

                        <div className="login-field">
                            <label>Password</label>
                            <div className="login-password-wrap">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError("") }}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="login-password-toggle"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={15} strokeWidth={1.75}/> : <Eye size={15} strokeWidth={1.75}/>}
                                </button>
                            </div>
                        </div>

                        {error && <p className="login-error">{error}</p>}

                        <button type="submit" className="login-submit">Sign in</button>
                    </form>

                    <p className="login-hint">
                        New to NextGen?{" "}
                        <Link to="/onboarding">Create your profile</Link>
                        {" "}- takes 3 minutes.
                    </p>

                </div>
            </div>

        </div>
    )
}
