import Navbar from "../components/Navbar.jsx";
import "./css/registration.css"
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, storeAuthUser } from "../services/usersApi.js";

export default function Register()
{
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await registerUser({ username, email, password });

            if (response.username && response.id != null) {
                storeAuthUser(response);
                navigate(`/users/${response.id}/`);
            } else {
                setError(response.message || "Registration failed. Please try again.");
            }
        } catch (err) {
            setError(err.message || "An error occurred during registration. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={"register-layout"}>
            <Navbar activeItem="register" />
            <div className={"register-content"}>
                <h1>Register</h1>
                {error && <p className={"register-error"}>{error}</p>}
                <form className={"register-form"} onSubmit={handleSubmit}>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        required
                        placeholder={"Username"}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                    />

                    <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        placeholder={"Email"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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

                    <button type="submit" disabled={isLoading}>{isLoading ? "Creating Account..." : "Create Account"}</button>
                </form>
            </div>
            <p>
                Already have an account? <Link to="/login">Log in here</Link>
            </p>
        </div>
    )
}