import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Navbar.css";
import SmallIcon from "../assets/HololiveOCGManagerLogo.png";
import { clearStoredAuthUser, getStoredAuthUser } from "../services/usersApi.js";

export default function Navbar({ activeItem = "dashboard" }) {
    const [authUser, setAuthUser] = useState(() => getStoredAuthUser());
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleStorageChange = () => {
            setAuthUser(getStoredAuthUser());
        };

        window.addEventListener("storage", handleStorageChange);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    const handleProfileClick = () => {
        if (authUser?.id != null) {
            navigate(`/users/${authUser.id}/`);
        }
        setIsUserMenuOpen(false);
    };

    const handleLogoutClick = () => {
        clearStoredAuthUser();
        setAuthUser(null);
        setIsUserMenuOpen(false);
        navigate("/");
    };

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

            {authUser?.username ? (
                <div className="user-menu" ref={userMenuRef}>
                    <button
                        id={"user-button"}
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={isUserMenuOpen}
                        onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
                    >
                        {authUser.username}
                    </button>
                    {isUserMenuOpen && (
                        <div className="user-menu-dropdown" role="menu">
                            <button type="button" role="menuitem" onClick={handleProfileClick}>
                                Profile
                            </button>
                            <button type="button" role="menuitem" onClick={handleLogoutClick}>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <button id={"login-button"} type="button" onClick={() => navigate("/login")}>
                    Login
                </button>
            )}
        </div>
    );
}