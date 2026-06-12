import { useEffect, useState, useRef } from "react";
import { getStoredAuthUser } from "../services/usersApi.js";
import { fetchDecksFromUser, fetchDeckCardsByCardId, updateDeckCard } from "../services/deckApi.js";
import { toast } from "react-hot-toast";

export default function AddCardToDeckDialog({ card, onBack, isOpen, onClose }) {
    const dialogRef = useRef(null);
    const [deckData, setDeckData] = useState(null);
    const [deckCardsData, setDeckCardsData] = useState(null);
    const [deckInfoLoading, setDeckInfoLoading] = useState(false);
    const [selectedDeckId, setSelectedDeckId] = useState(null);
    const [quantity, setQuantity] = useState(1);

    const storedAuthUser = getStoredAuthUser();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }

        if (isOpen) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else if (dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !card) {
            setDeckData(null);
            setDeckCardsData(null);
            setDeckInfoLoading(false);
            setSelectedDeckId(null);
            setQuantity(1);
            return;
        }

        let cancelled = false;

        const loadDeckDetails = async () => {
            setDeckInfoLoading(true);
            try {
                //TODO create an endpoint that fetches all decks instead of a page size of 999999999
                const decks = await fetchDecksFromUser(storedAuthUser?.id, { page: 0, size: 999999999 });
                if (cancelled) {
                    return;
                }
                setDeckData(decks);

                const cardId = card?.id ?? card?.cardId;
                if (cardId != null) {
                    const deckCards = await fetchDeckCardsByCardId(cardId);
                    if (!cancelled) {
                        const deckCardMap = deckCards.reduce((acc, deckCard) => {
                            const deckId = String(deckCard?.deckId ?? "");
                            if (deckId) {
                                acc[deckId] = deckCard;
                            }
                            return acc;
                        }, {});
                        setDeckCardsData(deckCardMap);
                    }
                } else {
                    setDeckCardsData({});
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to load deck details:", error);
                    setDeckData(null);
                    setDeckCardsData(null);
                }
            } finally {
                if (!cancelled) {
                    setDeckInfoLoading(false);
                }
            }
        };

        loadDeckDetails();

        return () => {
            cancelled = true;
        };
    }, [isOpen, card, storedAuthUser?.id]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const decks = deckData?.decks ?? [];
        if (!selectedDeckId && decks.length > 0) {
            setSelectedDeckId(decks[0].id ?? null);
        }
    }, [deckData, isOpen, selectedDeckId]);

    const decks = deckData?.decks ?? [];
    const selectedDeck = decks.find((deck) => String(deck?.id ?? "") === String(selectedDeckId ?? ""));

    const deckContainsCard = (deckId) => {
        const normalizedDeckId = String(deckId ?? "");
        return Boolean(deckCardsData?.[normalizedDeckId]);
    };

    const selectedDeckHasCard = selectedDeck?.id ? deckContainsCard(selectedDeck.id) : false;

    const handleQuantityChange = (event) => {
        const nextValue = Number(event.target.value);
        if (!Number.isFinite(nextValue)) {
            setQuantity(1);
            return;
        }
        setQuantity(Math.max(1, Math.floor(nextValue)));
    };

    const handleQuantityIncrease = () => {
        setQuantity((current) => Math.max(1, current + 1));
    };

    const handleQuantityDecrease = () => {
        setQuantity((current) => Math.max(1, current - 1));
    };

    const handleAddToDeck = async (e) => {
        if (selectedDeckId || card.id) {
            try {
                const response = await updateDeckCard(selectedDeckId, card.id, quantity);
                if (response?.id || response?.deckId) {
                    toast.success("Card successfully added!");
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    onClose();
                } else {
                    toast.error("Failed to add card to deck, please try again later.");
                }
            } catch (error) {
                console.error("Failed to add card to deck:", error);
                toast.error("Something went wrong.");
            }
        }
    }

    return (
        <dialog
            ref={dialogRef}
            className="add-card-to-deck-dialog"
            role="dialog"
            aria-modal="true"
            onClick={onBack}
            onClose={onClose}
            onCancel={onClose}
        >
            <div
                className="add-card-to-deck-dialog-modal"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="add-card-to-deck-dialog-content">
                    <div className={"add-card-to-deck-dialog-header"}>
                        <h2>Add "{card?.name ?? "Unknown card"}" to deck</h2>
                        <img
                            src={card?.imageUrl ?? card?.imageURL ?? ""}
                            alt={card?.name ?? "Card image"}
                            className="add-card-to-deck-dialog-card-image"
                        />
                    </div>
                    <div className={"add-card-to-deck-dialog-body"}>
                        <label className="add-card-to-deck-dialog-field">
                            Deck
                            <select
                                value={selectedDeckId ?? ""}
                                onChange={(event) => setSelectedDeckId(event.target.value)}
                                disabled={deckInfoLoading || decks.length === 0}
                            >
                                {decks.length === 0 && (
                                    <option value="">No decks available</option>
                                )}
                                {decks.map((deck) => {
                                    const deckId = deck?.id ?? "";
                                    const hasCard = deckContainsCard(deckId);
                                    const labelSuffix = hasCard ? " (already contains this card)" : "";
                                    return (
                                        <option key={deckId} value={deckId}>
                                            {deck?.title ?? "Untitled deck"}{labelSuffix}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>

                        <div className="add-card-to-deck-dialog-quantity">
                            <label className="add-card-to-deck-dialog-field">
                                Quantity
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quantity}
                                    onChange={handleQuantityChange}
                                    inputMode="numeric"
                                />
                            </label>
                            <div className="add-card-to-deck-dialog-quantity-controls">
                                <button type="button" onClick={handleQuantityDecrease}>-</button>
                                <button type="button" onClick={handleQuantityIncrease}>+</button>
                            </div>
                            <button type="button" onClick={handleAddToDeck}>Add to deck</button>
                        </div>

                        {selectedDeckHasCard && (
                            <p
                                className="add-card-to-deck-dialog-warning"
                                style={{ color: "#f0b429" }}
                            >
                                <span aria-hidden="true">!</span>{" "}
                                Warning: this will override the existing quantity in the deck: "{selectedDeck?.title ?? "Unknown"}"
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </dialog>
    )
}