import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import CardDetailDialog from "../components/CardDetailDialog";
import "./css/cardlist.css"
import PlaceholderCardImage from "../assets/test-card.png";
import { fetchCollection } from "../services/collectionApi.js";
import { fetchCardsPage, fetchCardsSearchPage, fetchCard } from "../services/cardsApi.js";
import { useNavigate, useParams } from "react-router-dom";

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

export default function CardList() {
    const { collectionId } = useParams();

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

    const [cards, setCards] = useState([]);
    const [collection, setCollection] = useState(null);
    const [page, setPage] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [activeFilters, setActiveFilters] = useState({
        bloomLvl: "",
        colour: "",
        cardSet: "",
        rarity: "",
        cardType: "",
        parallel: "",
        holomem: "",
    });
    const [searchSubmissionId, setSearchSubmissionId] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [hasLoadedInitialPage, setHasLoadedInitialPage] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const sentinelRef = useRef(null);
    const filterDialogRef = useRef(null);
    const addCardDialogRef = useRef(null);
    const addCardSentinelRef = useRef(null);
    const [addCardCards, setAddCardCards] = useState([]);
    const [addCardPage, setAddCardPage] = useState(0);
    const [addCardSearchInput, setAddCardSearchInput] = useState("");
    const [addCardFilters, setAddCardFilters] = useState(() => createDefaultCardFilters());
    const [addCardIsLoading, setAddCardIsLoading] = useState(false);
    const [addCardHasMore, setAddCardHasMore] = useState(true);
    const [addCardErrorMessage, setAddCardErrorMessage] = useState("");
    const [addCardUserScrolled, setAddCardUserScrolled] = useState(false);
    const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
    const [dialogViewType, setDialogViewType] = useState("list"); // "list" or "detail"
    const [detailCardData, setDetailCardData] = useState(null);
    const [detailCardLoading, setDetailCardLoading] = useState(false);
    const [detailCardError, setDetailCardError] = useState("");
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [savedDialogScrollPosition, setSavedDialogScrollPosition] = useState(0);
    const navigate = useNavigate();

    const getSubmittedFilters = useCallback((holomem) => {
        const form = filterDialogRef.current?.querySelector(".filter-dialog-form");
        const formData = form ? new FormData(form) : null;

        const readValue = (name) => {
            const value = formData?.get(name);
            return typeof value === "string" ? value.trim() : "";
        };

        return {
            bloomLvl: readValue("bloomLvl"),
            colour: readValue("colour"),
            cardSet: readValue("cardSet"),
            rarity: readValue("rarity"),
            cardType: readValue("cardType"),
            parallel: readValue("parallel"),
            holomem: holomem.trim(),
        };
    }, []);

    const filterSummary = [
        `Search: ${activeSearch || "All cards"}`,
        activeFilters.colour ? `Colour: ${activeFilters.colour}` : null,
        activeFilters.cardSet ? `Card set: ${activeFilters.cardSet}` : null,
        activeFilters.rarity ? `Rarity: ${activeFilters.rarity}` : null,
        activeFilters.bloomLvl ? `Bloom lvl: ${activeFilters.bloomLvl}` : null,
        activeFilters.parallel ? `Parallel: ${activeFilters.parallel}` : null,
    ]
        .filter(Boolean)
        .join(" | ");

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

    //load collection
    const loadPage = useCallback(async (pageToLoad, searchFilters, signal) => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const result = await fetchCollection(collectionId, {
                page: pageToLoad,
                size: 20,
                signal
            });

            setCollection(result.collection);
            setCards((previousCards) => {
                if (pageToLoad === 0) {
                    return result.cards;
                }

                return [...previousCards, ...result.cards];
            });
            setHasMore(result.hasMore);
            if (pageToLoad === 0) {
                setHasLoadedInitialPage(true);
            }
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }

            setErrorMessage(error?.message ?? "Failed to load collection.");
        } finally {
            setIsLoading(false);
        }
    }, [collectionId]);

    //load card page for dialog
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
                    size: 12,
                    ...searchFilters,
                    holomem: trimmedSearch,
                    signal,
                })
                : await fetchCardsPage({ page: pageToLoad, size: 12, signal });

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
        if (!isAddCardDialogOpen) {
            return;
        }

        const controller = new AbortController();
        loadAddCardPage(addCardPage, addCardFilters, addCardSearchInput, controller.signal);
        return () => {
            controller.abort();
        };
    }, [loadAddCardPage, addCardPage, addCardFilters, addCardSearchInput, isAddCardDialogOpen]);

    useEffect(() => {
        const controller = new AbortController();
        loadPage(page, activeFilters, controller.signal);
        return () => {
            controller.abort();
        };
    }, [loadPage, page, activeFilters, searchSubmissionId]);

    useEffect(() => {
        if (!hasLoadedInitialPage || !hasMore || isLoading) {
            return;
        }

        const target = sentinelRef.current;
        if (!target) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setPage((currentPage) => currentPage + 1);
                }
            },
            { rootMargin: "500px 0px" }
        );

        observer.observe(target);
        return () => {
            observer.disconnect();
        };
    }, [hasLoadedInitialPage, hasMore, isLoading]);

    useEffect(() => {
        if (!isAddCardDialogOpen || dialogViewType !== "list") {
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
    }, [isAddCardDialogOpen, dialogViewType]);

    useEffect(() => {
        if (!isAddCardDialogOpen || dialogViewType !== "list" || !addCardHasMore || addCardIsLoading) {
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
    }, [
        isAddCardDialogOpen,
        dialogViewType,
        addCardHasMore,
        addCardIsLoading,
        addCardCards.length,
        addCardUserScrolled,
    ]);

    // Restore scroll position when returning to list view from detail view
    useEffect(() => {
        if (dialogViewType === "list") {
            const timer = setTimeout(() => {
                const dialogElement = addCardDialogRef.current;
                if (dialogElement) {
                    dialogElement.scrollTop = savedDialogScrollPosition;
                }
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [dialogViewType, savedDialogScrollPosition]);

    const handleCardClick = async (cardId) => {
        setIsDetailDialogOpen(true);
        setDetailCardLoading(true);
        setDetailCardError("");
        setDetailCardData(null);

        try {
            const cardData = await fetchCard(cardId);
            setDetailCardData(cardData);
        } catch (error) {
            setDetailCardError(error?.message ?? "Failed to load card details.");
        } finally {
            setDetailCardLoading(false);
        }
    };

    const openFilterDialog = () => {
        const dialog = filterDialogRef.current;
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    };

    const openAddCardDialog = () => {
        const dialog = addCardDialogRef.current;
        if (dialog && !dialog.open) {
            setAddCardCards([]);
            setAddCardPage(0);
            setAddCardSearchInput("");
            setAddCardFilters(createDefaultCardFilters());
            setAddCardHasMore(true);
            setAddCardErrorMessage("");
            setDialogViewType("list");
            setDetailCardData(null);
            setIsAddCardDialogOpen(true);
            dialog.showModal();
        }
    };

    const closeFilterDialog = () => {
        const dialog = filterDialogRef.current;
        if (dialog?.open) {
            dialog.close();
        }
    };

    const closeAddCardsDialog = () => {
        const dialog = addCardDialogRef.current;
        if (dialog?.open) {
            dialog.close();
        }
        setIsAddCardDialogOpen(false);
        setDialogViewType("list");
        setDetailCardData(null);
    };

    const resetAddCardResults = () => {
        setAddCardCards([]);
        setAddCardPage(0);
        setAddCardHasMore(true);
        setAddCardErrorMessage("");
    };

    const handleAddCardSearchChange = (event) => {
        setAddCardSearchInput(event.target.value);
        resetAddCardResults();
    };

    const handleAddCardFilterChange = (name, value) => {
        setAddCardFilters((currentFilters) => ({
            ...currentFilters,
            [name]: value,
        }));
        resetAddCardResults();
    };

    const handleAddCardTileClick = async (cardId) => {
        // Save scroll position before transitioning
        const dialogElement = addCardDialogRef.current;
        if (dialogElement) {
            setSavedDialogScrollPosition(dialogElement.scrollTop);
        }

        // Switch to detail view
        setDialogViewType("detail");
        setDetailCardLoading(true);
        setDetailCardError("");

        try {
            const cardData = await fetchCard(cardId);
            setDetailCardData(cardData);
        } catch (error) {
            setDetailCardError(error?.message ?? "Failed to load card details.");
        } finally {
            setDetailCardLoading(false);
        }
    };

    const handleBackFromCardDetail = () => {
        // Return to list view (scroll position will be restored by useEffect)
        setDialogViewType("list");
        setDetailCardData(null);
    };

    const handleBackFromStandaloneCardDetail = () => {
        // Close the standalone card detail dialog completely
        setIsDetailDialogOpen(false);
        setDetailCardData(null);
        setDetailCardLoading(false);
        setDetailCardError("");
    };

    const handleCollectionAmountUpdated = useCallback((updatedCardId, nextAmount, updatedCardData) => {
        let previousAmount = 0;
        let hadMatch = false;

        setCards((previousCards) => {
            const nextCards = [];
            const targetCardId = String(updatedCardId ?? "");

            for (const card of previousCards) {
                const currentCardId = String(card?.id ?? card?.cardId ?? "");
                if (currentCardId !== targetCardId) {
                    nextCards.push(card);
                    continue;
                }

                hadMatch = true;
                previousAmount = Number(card?.cardCount ?? 0);

                if (nextAmount > 0) {
                    nextCards.push({
                        ...card,
                        cardCount: nextAmount,
                    });
                }
            }

            if (!hadMatch && nextAmount > 0 && updatedCardData) {
                nextCards.unshift({
                    id: updatedCardData?.raw?.id ?? updatedCardData?.id ?? null,
                    cardId: updatedCardData?.raw?.cardId ?? updatedCardData?.cardId ?? null,
                    name: updatedCardData?.name ?? "Unknown card",
                    imageUrl: updatedCardData?.imageUrl ?? "",
                    cardCount: nextAmount,
                });
            }

            return nextCards;
        });

        if (!hadMatch && !(nextAmount > 0 && updatedCardData)) {
            return;
        }

        setCollection((previousCollection) => {
            if (!previousCollection) {
                return previousCollection;
            }

            const delta = nextAmount - previousAmount;
            const wasPresent = previousAmount > 0;
            const isPresent = nextAmount > 0;

            return {
                ...previousCollection,
                totalCount: Number(previousCollection.totalCount ?? 0) + delta,
                totalCards: Number(previousCollection.totalCards ?? 0) + (wasPresent === isPresent ? 0 : (isPresent ? 1 : -1)),
            };
        });
    }, []);

    const getSelectedCardCollectionAmount = useCallback((cardData) => {
        if (!cardData) {
            return 0;
        }

        const selectedCardId = String(cardData?.id ?? cardData?.cardId ?? "");
        const matchingCard = cards.find((card) => String(card?.id ?? card?.cardId ?? "") === selectedCardId);

        return Number(matchingCard?.cardCount ?? cardData?.raw?.cardCount ?? cardData?.cardCount ?? 0);
    }, [cards]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();

        const nextSearch = searchInput.trim();
        const nextFilters = getSubmittedFilters(nextSearch);
        setCards([]);
        setPage(0);
        setHasMore(true);
        setHasLoadedInitialPage(false);
        setErrorMessage("");
        setActiveSearch(nextSearch);
        setActiveFilters(nextFilters);
        setSearchSubmissionId((currentSubmissionId) => currentSubmissionId + 1);
    };

    return (
        <div className="cardlist-layout">
            <Navbar activeItem="cardlist" />
            <div className="cardlist-content">
                <h1>Collection</h1>
                {collection && (
                    <div className="collection-header">
                        <h2>Collection ID: {collection.id}</h2>
                        <p><strong>Owner ID:</strong> {collection.ownerId}</p>
                        <p><strong>Visibility:</strong> {collection.visibility}</p>
                        <p><strong>Total Unique Cards:</strong> {collection.totalCards}</p>
                        <p><strong>Total Card Count:</strong> {collection.totalCount}</p>
                    </div>
                )}
                <button type="button" onClick={openAddCardDialog}>Add cards</button>
                <div className={"filter-section"}>
                    <p>Showing {cards.length} results</p>
                    <p>Filters: {filterSummary}</p>
                    <form onSubmit={handleSearchSubmit}>
                        <input
                            type={"search"}
                            id={"card-search"}
                            name={"card-search"}
                            placeholder={"Search cards by name"}
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                        />
                        <button type={"submit"}>Search Cards</button>
                    </form>
                    <button type="button" onClick={openFilterDialog}>Modify Filters</button>
                </div>
                <div className={"card-results"}>
                    {cards.map((card) => (
                        <button
                            key={`${card.id ?? card.name}`}
                            type="button"
                            className="card-tile"
                            data-card-id={card.id ?? ""}
                            onClick={() => handleCardClick(card.id)}
                        >
                            <img
                                src={card.imageUrl || PlaceholderCardImage}
                                alt={card.name}
                            />
                            <span className={"card-count-overlay"}>{card.cardCount}</span>
                            <span className="card-name-overlay">
                                {card.name} - {card.cardId}
                            </span>
                        </button>
                    ))}
                </div>

                <CardDetailDialog
                    isOpen={isDetailDialogOpen}
                    detailCardData={detailCardData}
                    detailCardLoading={detailCardLoading}
                    detailCardError={detailCardError}
                    collectionAmount={getSelectedCardCollectionAmount(detailCardData)}
                    onBack={handleBackFromStandaloneCardDetail}
                    onCollectionAmountUpdated={handleCollectionAmountUpdated}
                />

                {errorMessage && (
                    <p className="cardlist-status cardlist-error">{errorMessage}</p>
                )}
                {isLoading && <p className="cardlist-status">Loading cards...</p>}
                {!hasMore && cards.length > 0 && (
                    <p className="cardlist-status">No more cards to load.</p>
                )}

                <div ref={sentinelRef} className="scroll-sentinel" aria-hidden="true" />

                <dialog
                    ref={addCardDialogRef}
                    className="cardlist-dialog"
                    aria-label="Add Cards"
                    onClose={() => setIsAddCardDialogOpen(false)}
                    onCancel={closeAddCardsDialog}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            closeAddCardsDialog();
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
                            <button type="button" onClick={closeAddCardsDialog}>Close</button>
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
                                detailCardData={detailCardData}
                                detailCardLoading={detailCardLoading}
                                detailCardError={detailCardError}
                                collectionAmount={getSelectedCardCollectionAmount(detailCardData)}
                                onBack={handleBackFromCardDetail}
                                onCollectionAmountUpdated={handleCollectionAmountUpdated}
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

                <dialog
                    ref={filterDialogRef}
                    className="filter-dialog"
                    aria-label="Card filters"
                    onCancel={closeFilterDialog}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            closeFilterDialog();
                        }
                    }}
                >
                    <form className="filter-dialog-form">
                        <fieldset className="filter-dialog-radio-group">
                            <legend>Colour</legend>
                            {colourOptions.map((option) => (
                                <label key={option.value || option.label} className="filter-radio-button">
                                    <input type="radio" name="colour" value={option.value} defaultChecked={option.value === ""} />
                                    <span>{option.label || option.value}</span>
                                </label>
                            ))}
                        </fieldset>

                        <label>
                            Card set
                            <select name="cardSet" defaultValue="">
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
                                    <input type="radio" name="rarity" value={option.value} defaultChecked={option.value === ""} />
                                    <span>{option.label || option.value}</span>
                                </label>
                            ))}
                        </fieldset>

                        <fieldset className="filter-dialog-radio-group">
                            <legend>Bloom Lvl</legend>
                            {bloomLevelOptions.map((option) => (
                                <label key={option.value || option.label} className="filter-radio-button">
                                    <input type="radio" name="bloomLvl" value={option.value} defaultChecked={option.value === ""} />
                                    <span>{option.label || option.value}</span>
                                </label>
                            ))}
                        </fieldset>

                        <fieldset className="filter-dialog-radio-group">
                            <legend>Parallels</legend>
                            {parallelOptions.map((option) => (
                                <label key={option.value || option.label} className="filter-radio-button">
                                    <input type="radio" name="parallel" value={option.value} defaultChecked={option.value === ""} />
                                    <span>{option.label || option.value}</span>
                                </label>
                            ))}
                        </fieldset>
                    </form>
                </dialog>
            </div>
        </div>
    )
}

