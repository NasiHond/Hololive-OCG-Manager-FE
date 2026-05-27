import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import AddCardDialog from "../components/AddCardDialog";
import "./css/decklist.css";
import PlaceholderCardImage from "../assets/test-card.png";
import { fetchDeckPage, updateDeckCard } from "../services/deckApi.js";
import { getStoredAuthUser } from "../services/usersApi.js";
import CardDetailDialog from "../components/CardDetailDialog.jsx";
import { checkDeckLegality } from "../services/deckLegality.js";

const DECK_CARD_UPDATE_DEBOUNCE_MS = 400;

function replaceDeckCardCount(cards, normalizedCardId, nextCount) {
    return cards.map((card) => {
        const currentCardKey = String(card?.id ?? card?.cardId ?? "");
        if (currentCardKey !== normalizedCardId) {
            return card;
        }

        return {
            ...card,
            cardCount: nextCount,
        };
    });
}

export default function DeckPage() {

    //TODO GET COLOURS FROM BACKEND
    const colourOptions = [
        { value: "", label: "Any colour" },
        { value: "White", label: "White" },
        { value: "Green", label: "Green" },
        { value: "Red", label: "Red" },
        { value: "Blue", label: "Blue" },
        { value: "Purple", label: "Purple" },
        { value: "Yellow", label: "Yellow" },
        { value: "Colorless", label: "Neutral" },
    ];
    //TODO GET CARD-SETS FROM BACKEND
    const cardSetOptions = [
        { value: "", label: "Any set" },
    ];
    //TODO GET RARITIES FROM BACKEND
    const rarityOptions = [
        { value: "", label: "Any rarity" },
        { value: "c", label: "C" },
        { value: "u", label: "U" },
        { value: "r", label: "R" },
        { value: "rr", label: "RR" },
        { value: "sr", label: "SR" },
        { value: "ur", label: "UR" },
    ];
    const bloomLevelOptions = [
        { value: "", label: "Any bloom level" },
        { value: "spot", label: "Spot" },
        { value: "debut", label: "Debut" },
        { value: "1st", label: "1st" },
        { value: "2nd", label: "2nd" },
    ];
    const parallelOptions = [
        { value: "", label: "Any" },
        { value: "true", label: "Parallel Only" },
        { value: "false", label: "No Parallels" },
    ];

    const { deckId } = useParams();
    const [deck, setDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const cardsRef = useRef([]);
    const pendingCardUpdatesRef = useRef(new Map());
    const [isAddCardsDialogOpen, setIsAddCardsDialogOpen] = useState(false);
    const [isLegalityDialogOpen, setIsLegalityDialogOpen] = useState(false);
    const legalityDialogRef = useRef(null);
    const authUser = getStoredAuthUser();
    const isDeckOwner = useMemo(() => {
        if (!deck || authUser?.id == null) {
            return false;
        }

        return String(deck.ownerId ?? "") === String(authUser.id);
    }, [authUser?.id, deck]);

    const loadDeckPage = useCallback(async (signal) => {
        if (!deckId) {
            setDeck(null);
            setCards([]);
            setErrorMessage("Deck not found.");
            return;
        }

        setIsLoading(true);
        setErrorMessage("");

        try {
            const result = await fetchDeckPage(deckId, { signal });
            setDeck(result.deck);
            setCards(result.cards ?? []);
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }
            setErrorMessage(error?.message ?? "Failed to load deck.");
        } finally {
            setIsLoading(false);
        }
    }, [deckId]);

    useEffect(() => {
        const controller = new AbortController();
        loadDeckPage(controller.signal);
        return () => controller.abort();
    }, [loadDeckPage]);

    useEffect(() => {
        cardsRef.current = cards;
    }, [cards]);

    useEffect(() => {
        return () => {
            for (const pendingUpdate of pendingCardUpdatesRef.current.values()) {
                if (pendingUpdate.timerId) {
                    clearTimeout(pendingUpdate.timerId);
                }
                if (pendingUpdate.abortController) {
                    pendingUpdate.abortController.abort();
                }
            }
            pendingCardUpdatesRef.current.clear();
        };
    }, []);

    useEffect(() => {
        const dialog = legalityDialogRef.current;
        if (!dialog) {
            return;
        }

        if (isLegalityDialogOpen) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else if (dialog.open) {
            dialog.close();
        }
    }, [isLegalityDialogOpen]);

    useEffect(() => {
        const dialog = legalityDialogRef.current;
        if (!dialog) {
            return;
        }

        const handleClose = () => {
            setIsLegalityDialogOpen(false);
        };

        dialog.addEventListener("close", handleClose);
        return () => dialog.removeEventListener("close", handleClose);
    }, []);

    const queueDeckCardUpdate = useCallback((cardId, delta) => {
        if (!deckId || cardId == null) {
            return;
        }

        const normalizedCardId = String(cardId);
        const currentCard = cardsRef.current.find((card) => String(card?.id ?? card?.cardId ?? "") === normalizedCardId);
        if (!currentCard) {
            return;
        }

        const currentCount = Number(currentCard.cardCount ?? 0);
        const nextCount = Math.max(currentCount + delta, 0);

        const nextCards = replaceDeckCardCount(cardsRef.current, normalizedCardId, nextCount);

        cardsRef.current = nextCards;
        setCards(nextCards);
        setErrorMessage("");

        let pendingUpdate = pendingCardUpdatesRef.current.get(normalizedCardId);

        if (pendingUpdate === undefined || pendingUpdate === null) {
            pendingUpdate = {
                baselineCount: currentCount,
                targetCount: nextCount,
                timerId: null,
                abortController: null,
                version: 0,
            };
            pendingCardUpdatesRef.current.set(normalizedCardId, pendingUpdate);
        } else {
            pendingUpdate.targetCount = nextCount;
        }

        if (pendingUpdate.timerId) {
            clearTimeout(pendingUpdate.timerId);
        }

        pendingUpdate.version += 1;
        const requestVersion = pendingUpdate.version;

        pendingUpdate.timerId = globalThis.setTimeout(async () => {
            const latestPendingUpdate = pendingCardUpdatesRef.current.get(normalizedCardId);
            if (!latestPendingUpdate || latestPendingUpdate.version !== requestVersion) {
                return;
            }

            latestPendingUpdate.timerId = null;
            const rollbackCount = latestPendingUpdate.baselineCount;
            const saveCount = latestPendingUpdate.targetCount;
            const controller = new AbortController();
            latestPendingUpdate.abortController = controller;

            try {
                console.log(currentCard)
                await updateDeckCard(deckId, currentCard.id, saveCount, controller.signal);
                const completedUpdate = pendingCardUpdatesRef.current.get(normalizedCardId);
                if (completedUpdate && completedUpdate.version === requestVersion) {
                    pendingCardUpdatesRef.current.delete(normalizedCardId);
                }
            } catch (error) {
                if (error?.name === "AbortError") {
                    return;
                }

                const activeUpdate = pendingCardUpdatesRef.current.get(normalizedCardId);
                if (!activeUpdate || activeUpdate.version !== requestVersion) {
                    return;
                }

                const rolledBackCards = replaceDeckCardCount(cardsRef.current, normalizedCardId, rollbackCount);
                cardsRef.current = rolledBackCards;
                setCards(rolledBackCards);

                setErrorMessage(error?.message ?? "Failed to update deck card.");
                pendingCardUpdatesRef.current.delete(normalizedCardId);
            } finally {
                const activeUpdate = pendingCardUpdatesRef.current.get(normalizedCardId);
                if (activeUpdate?.version === requestVersion) {
                    activeUpdate.abortController = null;
                }
            }
        }, DECK_CARD_UPDATE_DEBOUNCE_MS);
    }, [deckId]);

    const handleAddClick = useCallback((cardId) => {
        queueDeckCardUpdate(cardId, 1);
    }, [queueDeckCardUpdate]);

    const handleRemoveClick = useCallback((cardId) => {
        queueDeckCardUpdate(cardId, -1);
    }, [queueDeckCardUpdate]);

    const openAddCardsDialog = () => {
        setIsAddCardsDialogOpen(true);
    }

    const closeAddCardsDialog = () => {
        setIsAddCardsDialogOpen(false);
    }

    const handleBackFromStandaloneCardDetail = () => {
        setIsDetailDialogOpen(false);
        setSelectedCardId(null);
    };

    const handleCardTileClick = useCallback((cardId) => {
        setSelectedCardId(cardId);
        setIsDetailDialogOpen(true);
    }, []);

    const totalUniqueCards = useMemo(() => cards.length, [cards.length]);
    const totalCardCount = useMemo(
        () => cards.reduce((total, card) => total + Number(card?.cardCount ?? 0), 0),
        [cards]
    );
    const cheerCardCount = useMemo(() => {
        return cards.reduce((total, card) => {
            const cardType = String(card?.raw?.cardTypeName ?? "").toLowerCase();
            if (cardType !== "cheer") {
                return total;
            }

            return total + Number(card?.cardCount ?? 0);
        }, 0);
    }, [cards]);
    const normalCardCount = useMemo(() => {
        return cards.reduce((total, card) => {
            const cardType = String(card?.raw?.cardTypeName ?? "").toLowerCase();
            if (cardType !== "holomem" && cardType !== "support" && cardType !== "buzz holomem") {
                return total;
            }

            return total + Number(card?.cardCount ?? 0);
        }, 0);
    }, [cards]);
    const legalityResult = useMemo(() => checkDeckLegality(cards), [cards]);
    const hasLegalityIssues = legalityResult.violations.length > 0;

    useEffect(() => {
        if (!hasLegalityIssues && isLegalityDialogOpen) {
            setIsLegalityDialogOpen(false);
        }
    }, [hasLegalityIssues, isLegalityDialogOpen]);

    const openLegalityDialog = useCallback(() => {
        if (hasLegalityIssues) {
            setIsLegalityDialogOpen(true);
        }
    }, [hasLegalityIssues]);

    return (
        <div className="cardlist-layout">
            <Navbar activeItem="decks" activeSubItem="allDecks" />
            <div className="cardlist-content">
                <h1>{deck?.title ?? "Deck"}</h1>
                {deck && (
                    <div className="collection-header">
                        <p><strong>Description:</strong> {deck.description || "No description available."}</p>
                        <p><strong>Owner:</strong> {deck.ownerName}</p>
                        <p><strong>Visibility:</strong> {deck.visibility ?? "Unknown"}</p>
                        <p><strong>Total Unique Cards:</strong> {totalUniqueCards}</p>
                        <p><strong>Total Card Count:</strong> {totalCardCount}</p>
                        <p><strong>Cheer Card Count:</strong> {cheerCardCount}</p>
                        <p><strong>Normal Card Count:</strong> {normalCardCount}</p>
                        <p
                            className={`deck-legality-status ${hasLegalityIssues ? "deck-legality-error" : "deck-legality-legal"}`}
                            onClick={openLegalityDialog}
                            role={hasLegalityIssues ? "button" : undefined}
                            tabIndex={hasLegalityIssues ? 0 : undefined}
                            onKeyDown={(event) => {
                                if (!hasLegalityIssues) {
                                    return;
                                }

                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    openLegalityDialog();
                                }
                            }}
                        >
                            <strong>Legal Status:</strong> {hasLegalityIssues ? "Illegal" : "Legal"}
                        </p>
                    </div>
                )}

                <button type="button" onClick={openAddCardsDialog}>Add cards</button>

                <div className="card-results">
                    {cards.map((card) => (
                        <div
                            key={card.id ?? card.cardId}
                            type="button"
                            className="card-tile"
                            data-card-id={card.cardId ?? ""}
                            onClick={() => handleCardTileClick(card.raw?.id ?? card.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    handleCardTileClick(card.raw?.id ?? card.id);
                                }
                            }}
                        >
                            <img
                                src={card.imageUrl || PlaceholderCardImage}
                                alt={card.name}
                            />
                            <span className="card-count-overlay">{card.cardCount}</span>
                            {isDeckOwner && (
                                <span className={"card-options-overlay"}>
                                    <button
                                        type="button"
                                        className="add-button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleAddClick(card.raw.id);
                                        }}
                                    >
                                        +
                                    </button>
                                    <button
                                        type="button"
                                        className="remove-button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleRemoveClick(card.raw.id);
                                        }}
                                    >
                                        -
                                    </button>
                                </span>
                            )}
                            <span className="card-name-overlay">
                                {card.raw.holomem} - {card.cardId}
                            </span>
                        </div>
                    ))}
                </div>

                <CardDetailDialog
                    isOpen={isDetailDialogOpen}
                    cardId={selectedCardId}
                    onBack={handleBackFromStandaloneCardDetail}
                />

                <AddCardDialog
                    isOpen={isAddCardsDialogOpen}
                    onClose={closeAddCardsDialog}
                    colourOptions={colourOptions}
                    cardSetOptions={cardSetOptions}
                    rarityOptions={rarityOptions}
                    bloomLevelOptions={bloomLevelOptions}
                    parallelOptions={parallelOptions}
                />

                <dialog
                    ref={legalityDialogRef}
                    className="deck-legality-dialog"
                    onCancel={(event) => {
                        event.preventDefault();
                        setIsLegalityDialogOpen(false);
                    }}
                >
                    <div className="deck-legality-dialog-content">
                        <div className="deck-legality-dialog-header">
                            <h2>Deck legality issues</h2>
                            <p>
                                Main deck: {legalityResult.counts.main}/50, Cheer deck: {legalityResult.counts.cheer}/20,
                                Oshi cards: {legalityResult.counts.oshi}
                            </p>
                        </div>
                        <ul className="deck-legality-list">
                            {legalityResult.violations.map((violation, index) => (
                                <li key={`${violation.code}-${violation.cardId ?? "deck"}-${index}`}>
                                    {violation.message}
                                </li>
                            ))}
                        </ul>
                        <div className="deck-legality-dialog-footer">
                            <button type="button" onClick={() => setIsLegalityDialogOpen(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </dialog>

                {errorMessage && (
                    <p className="cardlist-status cardlist-error">{errorMessage}</p>
                )}
                {isLoading && <p className="cardlist-status">Loading deck...</p>}
                {!isLoading && !errorMessage && cards.length === 0 && (
                    <p className="cardlist-status">No cards found in this deck.</p>
                )}
            </div>
        </div>
    );
}
