import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import "./css/cardlist.css"
import PlaceholderCardImage from "../assets/test-card.png";
import { fetchCardsPage, fetchCardsSearchPage } from "../services/cardsApi";

export default function CardList() {
    //TODO GET COLOURS FROM BACKEND
    const colourOptions = [
        { value: "", label: "Any colour" },
        { value: "White", label: "White" },
        { value: "Green", label: "Green" },
        { value: "Red", label: "Red" },
        { value: "Blue", label: "Blue" },
        { value: "Purple", label: "Purple" },
        { value: "Yellow", label: "Yellow" },
        { value: "Neutral", label: "Neutral" },
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
        // Add real rarity options here later, or load them from the API.
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
    const [selectedCardId, setSelectedCardId] = useState(null);
    const sentinelRef = useRef(null);
    const filterDialogRef = useRef(null);

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

    const loadPage = useCallback(async (pageToLoad, searchFilters, signal) => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const hasActiveSearchFilters = Object.values(searchFilters).some((value) => {
                return typeof value === "string" && value.trim() !== "";
            });

            const result = hasActiveSearchFilters
                ? await fetchCardsSearchPage({
                    page: pageToLoad,
                    size: 20,
                    ...searchFilters,
                    signal,
                })
                : await fetchCardsPage({ page: pageToLoad, size: 20, signal });

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

            setErrorMessage(error?.message ?? "Failed to load cards.");
        } finally {
            setIsLoading(false);
        }
    }, []);

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
            { rootMargin: "300px 0px" }
        );

        observer.observe(target);
        return () => {
            observer.disconnect();
        };
    }, [hasLoadedInitialPage, hasMore, isLoading]);

    const handleCardClick = (cardId) => {
        setSelectedCardId(cardId);
    };

    const openFilterDialog = () => {
        const dialog = filterDialogRef.current;
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    };

    const closeFilterDialog = () => {
        const dialog = filterDialogRef.current;
        if (dialog?.open) {
            dialog.close();
        }
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();

        const nextSearch = searchInput.trim();
        const nextFilters = getSubmittedFilters(nextSearch);
        setCards([]);
        setPage(0);
        setHasMore(true);
        setHasLoadedInitialPage(false);
        setSelectedCardId(null);
        setErrorMessage("");
        setActiveSearch(nextSearch);
        setActiveFilters(nextFilters);
        setSearchSubmissionId((currentSubmissionId) => currentSubmissionId + 1);
    };

    return (
        <div className="cardlist-layout">
            <Navbar user={{ name: "John Doe", initials: "JD" }} activeItem="cardlist" />
            <div className="cardlist-content">
                <h1>Card List</h1>
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
                            <span className="card-name-overlay">{card.name} - {card.cardId}</span>
                        </button>
                    ))}
                </div>

                {errorMessage && (
                    <p className="cardlist-status cardlist-error">{errorMessage}</p>
                )}
                {isLoading && <p className="cardlist-status">Loading cards...</p>}
                {!hasMore && cards.length > 0 && (
                    <p className="cardlist-status">No more cards to load.</p>
                )}

                <div ref={sentinelRef} className="scroll-sentinel" aria-hidden="true" />
                <p className="selected-card-id" hidden={selectedCardId == null}>
                    Selected card ID: {selectedCardId}
                </p>

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

