import { Navigate, Routes, Route } from "react-router-dom";
import HomePage from "./pages/home.jsx";
import CardList from "./pages/cardlist.jsx";
import CardDetails from "./pages/cardDetails.jsx";
import CardCollection from "./pages/cardCollection.jsx";
import DeckList from "./pages/deckList.jsx";
import MyDecks from "./pages/myDecks.jsx";
import DeckPage from "./pages/deckPage.jsx";
import Login from "./pages/login.jsx"
import Register from "./pages/registration.jsx"
import UserPage from "./pages/user.jsx"

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cardlist" element={<CardList />} />
            <Route path="/cards/:cardId" element={<CardDetails />} />
            <Route path="/collections/:collectionId" element={<CardCollection />} />
            <Route path="/decks" element={<DeckList />} />
            <Route path="/decks/:deckId" element={<DeckPage />} />
            <Route path="/my-decks" element={<MyDecks />} />
            <Route path={"/login"} element={<Login />} />
            <Route path={"/register"} element={<Register />} />
            <Route path="/users/:id/" element={<UserPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;