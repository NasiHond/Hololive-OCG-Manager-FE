import { Navigate, Routes, Route } from "react-router-dom";
import HomePage from "./pages/home.jsx";
import CardList from "./pages/cardlist.jsx";

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cardlist" element={<CardList />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;