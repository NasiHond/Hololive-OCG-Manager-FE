import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./css/cardDetails.css"
import PlaceholderCardImage from "../assets/test-card.png";
import { fetchCard } from "../services/cardsApi.js";

export default function CardDetails() {
    const { cardId: routeCardId } = useParams();
    const [searchParams] = useSearchParams();
    const resolvedCardId = routeCardId ?? searchParams.get("cardId") ?? "";

    const [card, setCard] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const loadCard = useCallback(async () => {
        if (!resolvedCardId) {
            setCard(null);
            setErrorMessage("No card selected.");
            return;
        }

        setIsLoading(true);
        setErrorMessage("");

        try {
            const payload = await fetchCard(resolvedCardId);
            setCard(payload);
        } catch (error) {
            setCard(null);
            setErrorMessage(error?.message ?? "Failed to load card details.");
        } finally {
            setIsLoading(false);
        }
    }, [resolvedCardId]);

    useEffect(() => {
        loadCard();
    }, [loadCard]);

    const rawCard = card?.raw ?? {};
    const arts = Array.isArray(rawCard?.arts) ? rawCard.arts : [];

    const displayValue = (value) => {
        if (value === null || value === undefined || value === "") {
            return "-";
        }

        return value;
    };

    return (
        <div className="carddetail-layout">
            <Navbar activeItem="cardlist" />
            <div className="carddetail-content">
                {errorMessage && <p className="carddetail-error">{errorMessage}</p>}
                {isLoading && <p className="carddetail-loading">Loading card...</p>}

                <img
                    src={card?.imageUrl || PlaceholderCardImage}
                    alt={card?.name || "Card image"}
                    className="carddetail-image"
                />
                <div className="carddetail-info">
                    <h1>{card?.name || "Card details"}</h1>

                    <dl className="info">
                        <dt>Card ID</dt>
                        <dd>{displayValue(rawCard.cardId ?? card?.cardId)}</dd>

                        <dt>Card Set</dt>
                        <dd>{displayValue(rawCard.cardSet)}</dd>

                        <dt>Type</dt>
                        <dd>{displayValue(rawCard.cardTypeName)}</dd>

                        <dt>Colour</dt>
                        <dd>{displayValue(rawCard.cardColour)}</dd>

                        <dt>Holomem</dt>
                        <dd>{displayValue(rawCard.holomem)}</dd>

                        <dt>Bloom Level</dt>
                        <dd>{displayValue(rawCard.bloomLvl)}</dd>

                        <dt>HP</dt>
                        <dd>{displayValue(rawCard.hp)}</dd>

                        <dt>Rarity</dt>
                        <dd>{displayValue(rawCard.rarity)}</dd>

                        <dt>Baton Pass</dt>
                        <dd>{displayValue(rawCard.batonpass)}</dd>

                        <dt>Extra Effect</dt>
                        <dd>{displayValue(rawCard.extraEffect)}</dd>
                    </dl>

                    <section className="card-arts">
                      <h2>Arts</h2>

                      {arts.length === 0 ? (
                        <p>No arts available.</p>
                      ) : (
                        <ul className="arts-list">
                          {arts.map((art, index) => (
                            <li key={art?.id ?? index} className="art-item">
                              <div className="art-header">
                                <h3>{art?.name || `Art ${index + 1}`}</h3>
                              </div>

                              <div className="art-stats">
                                <span>Damage: {art?.damage ?? "-"}</span>
                                {art?.critColourName ? <span>Crit: {art.critColourName}</span> : null}
                              </div>

                              <div className="art-costs">
                                {(art?.costs ?? []).length === 0 ? (
                                  <span>No cost</span>
                                ) : (
                                  art.costs.map((cost, costIndex) => (
                                    <span key={cost?.id ?? costIndex} className="cost-chip">
                                      {cost?.amount ?? "?"}
                                    </span>
                                  ))
                                )}
                              </div>

                              <p className="art-effect">{art?.effect || "No effect text."}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                </div>
            </div>
        </div>
    );
}