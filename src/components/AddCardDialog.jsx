import { useCallback, useEffect, useRef, useState } from "react";
import CardDetailDialog from "./CardDetailDialog";
import PlaceholderCardImage from "../assets/test-card.png";
import { fetchCardsPage, fetchCardsSearchPage } from "../services/cardsApi.js";
import { updateDeckCard } from "../services/deckApi.js";
import { useLocation, useParams } from "react-router-dom";

const PAGE_SIZE = 12;

function createDefaultCardFilters() {
    return {
        bloomLvl: "",
        colour: "",
        cardSet: "",
        rarity: "",
        cardType: "",
        parallel: "",
        holomem: "",
    };
}

export default function AddCardDialog({
    isOpen,
    onClose,
    colourOptions,
    cardSetOptions,
    rarityOptions,
    bloomLevelOptions,
    parallelOptions,
    onCollectionAmountUpdated,
}) {
    const addCardDialogRef = useRef(null);
    const addCardSentinelRef = useRef(null);
    const wasOpenRef = useRef(false);

    const [addCardCards, setAddCardCards] = useState([]);
    const [addCardPage, setAddCardPage] = useState(0);
    const [addCardSearchInput, setAddCardSearchInput] = useState("");
    const [addCardFilters, setAddCardFilters] = useState(() => createDefaultCardFilters());
    const [addCardIsLoading, setAddCardIsLoading] = useState(false);
    const [addCardHasMore, setAddCardHasMore] = useState(true);
    const [addCardErrorMessage, setAddCardErrorMessage] = useState("");
    const [addCardUserScrolled, setAddCardUserScrolled] = useState(false);
    const [dialogViewType, setDialogViewType] = useState("list");
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [savedDialogScrollPosition, setSavedDialogScrollPosition] = useState(0);
    const location = useLocation();
    const { deckId } = useParams();

    const isDeckRoute = Boolean(deckId) && location.pathname.includes("/decks/");

    const addCardFilterSummary = [
        addCardSearchInput.trim() ? `Search: ${addCardSearchInput.trim()}` : "Search: All cards",
        addCardFilters.colour ? `Colour: ${addCardFilters.colour}` : null,
        addCardFilters.cardSet ? `Card set: ${addCardFilters.cardSet}` : null,
        addCardFilters.rarity ? `Rarity: ${addCardFilters.rarity}` : null,
        addCardFilters.bloomLvl ? `Bloom lvl: ${addCardFilters.bloomLvl}` : null,
        addCardFilters.parallel ? `Parallel: ${addCardFilters.parallel}` : null,
    ]
        .filter(Boolean)
        .join(" | ");

    const resetAddCardResults = useCallback(() => {
        setAddCardCards([]);
        setAddCardPage(0);
        setAddCardHasMore(true);
        setAddCardErrorMessage("");
    }, []);

    const resetDialogState = useCallback(() => {
        setAddCardCards([]);
        setAddCardPage(0);
        setAddCardSearchInput("");
        setAddCardFilters(createDefaultCardFilters());
        setAddCardIsLoading(false);
        setAddCardHasMore(true);
        setAddCardErrorMessage("");
        setAddCardUserScrolled(false);
        setDialogViewType("list");
        setSelectedCardId(null);
        setSavedDialogScrollPosition(0);
    }, []);

    const loadAddCardPage = useCallback(async (pageToLoad, searchFilters, searchInputValue, signal) => {
        setAddCardIsLoading(true);
        setAddCardErrorMessage("");

        try {
            const trimmedSearch = searchInputValue.trim();
            const hasActiveSearchFilters =
                trimmedSearch !== "" ||
                Object.values(searchFilters).some((value) => typeof value === "string" && value.trim() !== "");

            const result = hasActiveSearchFilters
                ? await fetchCardsSearchPage({
                    page: pageToLoad,
                    size: PAGE_SIZE,
                    ...searchFilters,
                    holomem: trimmedSearch,
                    signal,
                })
                : await fetchCardsPage({ page: pageToLoad, size: PAGE_SIZE, signal });

            setAddCardCards((previousCards) => {
                if (pageToLoad === 0) {
                    return result.cards;
                }

                return [...previousCards, ...result.cards];
            });
            setAddCardHasMore(result.hasMore);
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }

            setAddCardErrorMessage(error?.message ?? "Failed to load cards.");
        } finally {
            setAddCardIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const dialog = addCardDialogRef.current;
        if (!dialog) {
            return;
        }

        if (isOpen) {
            if (!wasOpenRef.current) {
                resetDialogState();
            }
            if (!dialog.open) {
                dialog.showModal();
            }
        } else if (dialog.open) {
            dialog.close();
        }

        wasOpenRef.current = isOpen;
    }, [isOpen, resetDialogState]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const controller = new AbortController();
        loadAddCardPage(addCardPage, addCardFilters, addCardSearchInput, controller.signal);
        return () => {
            controller.abort();
        };
    }, [loadAddCardPage, addCardPage, addCardFilters, addCardSearchInput, isOpen]);

    useEffect(() => {
        if (!isOpen || dialogViewType !== "list") {
            setAddCardUserScrolled(false);
            return;
        }

        const dialogElement = addCardDialogRef.current;
        if (!dialogElement) {
            return;
        }

        const handleScroll = () => {
            if (dialogElement.scrollTop > 0) {
                setAddCardUserScrolled(true);
            }
        };

        dialogElement.addEventListener("scroll", handleScroll);
        return () => {
            dialogElement.removeEventListener("scroll", handleScroll);
        };
    }, [isOpen, dialogViewType]);

    useEffect(() => {
        if (!isOpen || dialogViewType !== "list" || !addCardHasMore || addCardIsLoading) {
            return;
        }

        if (!addCardUserScrolled || addCardCards.length === 0) {
            return;
        }

        const dialogElement = addCardDialogRef.current;
        const target = addCardSentinelRef.current;
        if (!dialogElement || !target || dialogElement.scrollHeight <= dialogElement.clientHeight) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setAddCardPage((currentPage) => currentPage + 1);
                }
            },
            { root: dialogElement, rootMargin: "200px 0px" }
        );

        observer.observe(target);
        return () => {
            observer.disconnect();
        };
    }, [isOpen, dialogViewType, addCardHasMore, addCardIsLoading, addCardCards.length, addCardUserScrolled]);

    useEffect(() => {
        if (dialogViewType === "list") {
            const timer = globalThis.setTimeout(() => {
                const dialogElement = addCardDialogRef.current;
                if (dialogElement) {
                    dialogElement.scrollTop = savedDialogScrollPosition;
                }
            }, 0);
            return () => globalThis.clearTimeout(timer);
        }
    }, [dialogViewType, savedDialogScrollPosition]);

    const handleClose = useCallback(() => {
        const dialog = addCardDialogRef.current;
        if (dialog?.open) {
            dialog.close();
        }
        setDialogViewType("list");
        setSelectedCardId(null);
        setSavedDialogScrollPosition(0);
    }, []);

    const handleAddCardSearchChange = useCallback((event) => {
        setAddCardSearchInput(event.target.value);
        resetAddCardResults();
    }, [resetAddCardResults]);

    const handleAddCardFilterChange = useCallback((name, value) => {
        setAddCardFilters((currentFilters) => ({
            ...currentFilters,
            [name]: value,
        }));
        resetAddCardResults();
    }, [resetAddCardResults]);

    const handleAddCardTileClick = useCallback((cardId) => {
        if (isDeckRoute) {
            updateDeckCard(deckId, cardId, 1)
                .then((response) => console.log(response))
                .catch((error) => console.error(error));
            handleClose();
            return;
        }

        const dialogElement = addCardDialogRef.current;
        if (dialogElement) {
            setSavedDialogScrollPosition(dialogElement.scrollTop);
        }

        setSelectedCardId(cardId);
        setDialogViewType("detail");
    }, [deckId, handleClose, isDeckRoute]);

    const handleBackFromCardDetail = useCallback(() => {
        setDialogViewType("list");
        setSelectedCardId(null);
    }, []);

    return (
        <dialog
            ref={addCardDialogRef}
            className="cardlist-dialog"
            aria-label="Add Cards"
            onClose={onClose}
            onCancel={handleClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div className="cardlist-dialog-content">
                <div className="cardlist-dialog-header">
                    <h2>Add cards</h2>
                    <p>Browse cards below and narrow the list with live filters.</p>
                </div>

                <div className="cardlist-dialog-toolbar">
                    {dialogViewType === "list" && (
                        <input
                            type="search"
                            id="add-card-search"
                            name="add-card-search"
                            placeholder="Search cards by name"
                            value={addCardSearchInput}
                            onChange={handleAddCardSearchChange}
                        />
                    )}
                    <button type="button" onClick={handleClose}>Close</button>
                </div>

                {dialogViewType === "list" && (
                    <p className="cardlist-dialog-summary">Filters: {addCardFilterSummary}</p>
                )}

                {dialogViewType === "list" && (
                    <div className="cardlist-dialog-filters">
                        <fieldset className="filter-dialog-radio-group">
                            <legend>Colour</legend>
                            {colourOptions.map((option) => (
                                <label key={option.value || option.label} className="filter-radio-button">
                                    <input
                                        type="radio"
                                        name="add-card-colour"
                                        value={option.value}
                                        checked={addCardFilters.colour === option.value}
                                        onChange={() => handleAddCardFilterChange("colour", option.value)}
                                    />
                                    <span>{option.label || option.value}</span>
                                </label>
                            ))}
                        </fieldset>

                        <label>
                            Card set
                            <select
                                name="add-card-set"
                                value={addCardFilters.cardSet}
                                onChange={(event) => handleAddCardFilterChange("cardSet", event.target.value)}
                            >
                                {cardSetOptions.map((option) => (
                                    <option key={option.value || option.label} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <fieldset className="filter-dialog-radio-group">
                            <legend>Rarity</legend>
                            {rarityOptions.map((option) => (
                                <label key={option.value || option.label} className="filter-radio-button">
                                    <input
                                        type="radio"
                                        name="add-card-rarity"
                                        value={option.value}
                                        checked={addCardFilters.rarity === option.value}
                                        onChange={() => handleAddCardFilterChange("rarity", option.value)}
                                    />
                                    <span>{option.label || option.value}</span>
                                </label>
                            ))}
                        </fieldset>

                        <fieldset className="filter-dialog-radio-group">
                            <legend>Bloom Lvl</legend>
                            {bloomLevelOptions.map((option) => (
                                <label key={option.value || option.label} className="filter-radio-button">
                                    <input
                                        type="radio"
                                        name="add-card-bloomLvl"
                                        value={option.value}
                                        checked={addCardFilters.bloomLvl === option.value}
                                        onChange={() => handleAddCardFilterChange("bloomLvl", option.value)}
                                    />
                                    <span>{option.label || option.value}</span>
                                </label>
                            ))}
                        </fieldset>

                        <fieldset className="filter-dialog-radio-group">
                            <legend>Parallels</legend>
                            {parallelOptions.map((option) => (
                                <label key={option.value || option.label} className="filter-radio-button">
                                    <input
                                        type="radio"
                                        name="add-card-parallel"
                                        value={option.value}
                                        checked={addCardFilters.parallel === option.value}
                                        onChange={() => handleAddCardFilterChange("parallel", option.value)}
                                    />
                                    <span>{option.label || option.value}</span>
                                </label>
                            ))}
                        </fieldset>
                    </div>
                )}

                {addCardErrorMessage && (
                    <p className="cardlist-status cardlist-error">{addCardErrorMessage}</p>
                )}

                {dialogViewType === "list" ? (
                    <div className="card-results cardlist-dialog-results">
                        {addCardCards.map((card) => (
                            <button
                                key={`add-card-${card.id ?? card.name}`}
                                type="button"
                                className="card-tile"
                                data-card-id={card.id ?? ""}
                                onClick={() => handleAddCardTileClick(card.id)}
                            >
                                <img
                                    src={card.imageUrl || PlaceholderCardImage}
                                    alt={card.name}
                                />
                                <span className="card-name-overlay">
                                    {card.name} - {card.cardId}
                                    {card.cardCount && card.cardCount > 1 && (
                                        <span className="card-count"> x{card.cardCount}</span>
                                    )}
                                </span>
                            </button>
                        ))}
                        <div ref={addCardSentinelRef} className="scroll-sentinel" aria-hidden="true" />
                    </div>
                ) : (
                    <CardDetailDialog
                        isOpen={dialogViewType === "detail"}
                        cardId={selectedCardId}
                        onBack={handleBackFromCardDetail}
                        onCollectionAmountUpdated={onCollectionAmountUpdated}
                    />
                )}

                {dialogViewType === "list" && (
                    <>
                        {addCardIsLoading && <p className="cardlist-status">Loading cards...</p>}
                        {!addCardIsLoading && addCardCards.length === 0 && !addCardErrorMessage && (
                            <p className="cardlist-status">No cards found for the current filters.</p>
                        )}

                        <div className="cardlist-dialog-footer">
                            {!addCardHasMore && addCardCards.length > 0 && (
                                <p className="cardlist-status">No more cards to load.</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </dialog>
    );
}