import Navbar from "../components/Navbar.jsx";
import "./css/login.css"
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, storeAuthUser } from "../services/usersApi.js";

export default function Login()
{
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await loginUser({ identifier, password });

            if (response.authenticated && response.username && response.id != null) {
                storeAuthUser(response);
                navigate(`/users/${response.id}/`);
            } else {
                setError(response.message || "Login failed. Please try again.");
            }
        } catch (err) {
            setError(err.message || "An error occurred during login. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={"login-layout"}>
            <Navbar activeItem="login" />
            <div className={"login-content"}>
                <h1>Login</h1>
                {error && <p className={"login-error"}>{error}</p>}
                <form className={"login-form"} onSubmit={handleSubmit}>
                    <input
                        type="text"
                        id="identifier"
                        name="identifier"
                        required
                        placeholder={"Email or Username"}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        disabled={isLoading}
                    />

                    <input
                        type="password"
                        id="password"
                        name="password"
                        required
                        placeholder={"Password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />

                    <button type="submit" disabled={isLoading}>{isLoading ? "Logging in..." : "Login"}</button>
                </form>
            </div>
            <p>
                Don't have an account yet? <Link to="/register">Create one</Link>
            </p>
        </div>
    )
}