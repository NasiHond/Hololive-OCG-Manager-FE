import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Navbar.css";
import SmallIcon from "../assets/HololiveOCGManagerLogo.png";

export default function Navbar({ activeItem = "dashboard" }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const handleLogin = () => {
        localStorage.removeItem("user");
        navigate("/");
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const menuItems = [
        { key: "cardlist", label: "Card List", path: "/cardlist" },
        { key: "decks", label: "Decks", path: "/decks" },
        { key: "collection", label: "Collection", path: "/collection" },
        { key: "news", label: "News", path: "/news" },
    ];

    return (
        <div className="navbar">
            <div
                className="navbar-logo"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/")}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate("/");
                    }
                }}
            >
                <img src={SmallIcon} alt="HoloOCG icon" width="125" height="125"/>
            </div>

            {menuItems.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    className={activeItem === item.key ? "active" : ""}
                    onClick={() => navigate(item.path)}
                >
                    {item.label}
                </button>
            ))}

            <button id={"login-button"} type="button" onClick={handleLogin}>
                Login
            </button>
        </div>
    );
}