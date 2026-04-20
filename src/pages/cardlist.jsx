import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import "./css/cardlist.css"
import PlaceholderCardImage from "../assets/test-card.png";
import { fetchCardsPage } from "../services/cardsApi";

export default function CardList() {
    const [cards, setCards] = useState([]);
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [hasLoadedInitialPage, setHasLoadedInitialPage] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [selectedCardId, setSelectedCardId] = useState(null);
    const sentinelRef = useRef(null);

    const loadPage = useCallback(async (pageToLoad, signal) => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const result = await fetchCardsPage({ page: pageToLoad, size: 20, signal });
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
        loadPage(page, controller.signal);
        return () => {
            controller.abort();
        };
    }, [loadPage, page]);

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

    return (
        <div className="cardlist-layout">
            <Navbar user={{ name: "John Doe", initials: "JD" }} activeItem="cardlist" />
            <div className="cardlist-content">
                <h1>Card List</h1>
                <div className={"filter-section"}>
                    <p>Showing {cards.length} results</p>
                    <h2>Search: (definitely works)</h2>
                    <button>Modify Filters</button>
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
                            <span className="card-name-overlay">{card.name}</span>
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
            </div>
        </div>
    )
}

