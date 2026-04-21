import { Navigate, Routes, Route } from "react-router-dom";
import HomePage from "./pages/home.jsx";
import CardList from "./pages/cardlist.jsx";
import Login from "./pages/login.jsx"
import Register from "./pages/registration.jsx"
import UserPage from "./pages/user.jsx"

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cardlist" element={<CardList />} />
            <Route path={"/login"} element={<Login />} />
            <Route path={"/register"} element={<Register />} />
            <Route path="/users/:id/" element={<UserPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;