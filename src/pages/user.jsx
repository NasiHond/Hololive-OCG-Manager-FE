import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

export default function UserPage() {
    const { id } = useParams();

    return (
        <div className="user-layout">
            <Navbar activeItem="" />
            <div className="user-content">
                <h1>User Account</h1>
                <p>Account ID: {id}</p>
            </div>
        </div>
    );
}

