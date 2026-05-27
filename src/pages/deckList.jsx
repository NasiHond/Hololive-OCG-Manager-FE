import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import "./css/decklist.css";
import { fetchDecks } from "../services/deckApi.js";

const missingDeckImage =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='190' height='190' viewBox='0 0 190 190'><rect width='190' height='190' fill='%23ffffff'/><text x='95' y='95' font-family='Arial, sans-serif' font-size='28' fill='%23000000' text-anchor='middle' dominant-baseline='middle'>404</text><text x='95' y='125' font-family='Arial, sans-serif' font-size='12' fill='%23000000' text-anchor='middle' dominant-baseline='middle'>Image Not Found</text></svg>";

export default function DeckList() {
    const [decks, setDecks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    const loadDecks = useCallback(async (signal) => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const result = await fetchDecks({ page: 0, size: 40, signal });
            setDecks(result.decks ?? []);
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }
            setErrorMessage(error?.message ?? "Failed to load decks.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleDeckClick = async (deckId) =>
    {
        if (deckId == null)
        {
            return;
        }

        navigate("/decks/" + deckId);
    }

    useEffect(() => {
        const controller = new AbortController();
        loadDecks(controller.signal);
        return () => controller.abort();
    }, [loadDecks]);

    const totalDecksLabel = useMemo(() => decks.length.toString(), [decks.length]);

    return (
        <div className="decklist-layout">
            <Navbar activeItem="decks" activeSubItem={"allDecks"}/>
            <div className="decklist-content">
                <h1>Deck List</h1>
                <p>Showing {totalDecksLabel} decks</p>

                <div className="deck-results">
                    {decks.map((deck) => (
                        <button
                            key={deck.id ?? deck.title}
                            type="button"
                            className="deck-tile"
                            data-deck-id={deck.id ?? ""}
                            onClick={() =>handleDeckClick(deck.id)}
                        >
                            <img
                                src={deck.deckImageUrl || missingDeckImage}
                                alt={deck.title}
                                onError={(event) => {
                                    if (event.currentTarget.src !== missingDeckImage) {
                                        event.currentTarget.src = missingDeckImage;
                                    }
                                }}
                            />
                            <div className="deck-info">
                                <p className="deck-title">{deck.title}</p>
                                <p className="deck-owner">{deck.ownerName}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {errorMessage && (
                    <p className="decklist-status decklist-error">{errorMessage}</p>
                )}
                {isLoading && <p className="decklist-status">Loading decks...</p>}
                {!isLoading && !errorMessage && decks.length === 0 && (
                    <p className="decklist-status">No decks found.</p>
                )}
            </div>
        </div>
    );
}