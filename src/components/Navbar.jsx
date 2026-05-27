import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Navbar.css";
import SmallIcon from "../assets/HololiveOCGManagerLogo.png";
import { clearStoredAuthUser, getStoredAuthUser } from "../services/usersApi.js";

export default function Navbar({ activeItem, activeSubItem }) {
    const [authUser, setAuthUser] = useState(() => getStoredAuthUser());
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isDecksMenuOpen, setIsDecksMenuOpen] = useState(false);
    const userMenuRef = useRef(null);
    const decksMenuRef = useRef(null);
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
            if (decksMenuRef.current && !decksMenuRef.current.contains(event.target)) {
                setIsDecksMenuOpen(false);
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
        } else {
            navigate("/");
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
        { key: "collection", label: "Collection", path: authUser?.id ? `/collections/${authUser.id}/` : "/login" },
        { key: "news", label: "News", path: "/news" },
    ];

    const menuItemsBeforeDecks = menuItems.filter((item) => item.key !== "news");
    const menuItemsAfterDecks = menuItems.filter((item) => item.key === "news");

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

            {menuItemsBeforeDecks.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    className={activeItem === item.key ? "active" : ""}
                    onClick={() => navigate(item.path)}
                >
                    {item.label}
                </button>
            ))}

            <div className="user-menu" ref={decksMenuRef}>
                <button
                    type="button"
                    className={activeItem === "decks" ? "active" : ""}
                    aria-haspopup="menu"
                    aria-expanded={isDecksMenuOpen}
                    onClick={() => setIsDecksMenuOpen((isOpen) => !isOpen)}
                >
                    Decks
                </button>
                {isDecksMenuOpen && (
                    <div className="user-menu-dropdown" role="menu">
                        <button
                            type="button"
                            role="menuitem"
                            className={activeSubItem === "allDecks" ? "active" : ""}
                            onClick={() => {
                                setIsDecksMenuOpen(false);
                                navigate("/decks");
                            }}
                        >
                            Search all decks
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            className={activeSubItem === "myDecks" ? "active" : ""}
                            onClick={() => {
                                setIsDecksMenuOpen(false);
                                navigate(authUser?.id ? "/my-decks" : "/login");
                            }}
                        >
                            My decks
                        </button>
                    </div>
                )}
            </div>

            {menuItemsAfterDecks.map((item) => (
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
                        className={activeItem === "user" ? "active" : ""}
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
                <button id={"login-button"} type="button" onClick={() => navigate("/login")}
                >
                    Login
                </button>
            )}
        </div>
    );
}