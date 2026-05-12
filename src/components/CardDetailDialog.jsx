import { useEffect, useState } from "react";
import "./css/CardDetailDialog.css";
import PlaceholderCardImage from "../assets/test-card.png";
import { getStoredAuthUser } from "../services/usersApi.js";
import { updateCollectionCard } from "../services/collectionApi.js";
import { validateToken } from "../services/authApi.js";

export default function CardDetailDialog({
    detailCardData,
    detailCardLoading,
    detailCardError,
    onBack,
    isOpen,
    isLoggedIn,
    collectionAmount,
    onCollectionAmountUpdated,
}) {
    const storedAuthUser = getStoredAuthUser();
    const hasStoredCollectionAmount = Number.isFinite(Number(collectionAmount));
    const hasDetailCardAmount = Number.isFinite(Number(detailCardData?.raw?.cardCount ?? detailCardData?.cardCount));
    const [isTokenValid, setIsTokenValid] = useState(null);

    const effectiveAuth = isTokenValid === null ? (isLoggedIn ?? Boolean(storedAuthUser)) : Boolean(isTokenValid);
    const canShowCollectionControls = effectiveAuth && (hasStoredCollectionAmount || hasDetailCardAmount);
    const initialCollectionAmount = hasStoredCollectionAmount
        ? Number(collectionAmount)
        : Number(detailCardData?.raw?.cardCount ?? detailCardData?.cardCount ?? 0);
    const [collectionAmountInput, setCollectionAmountInput] = useState(String(initialCollectionAmount));

    useEffect(() => {
        if (!isOpen || !detailCardData) {
            return;
        }

        setCollectionAmountInput(String(initialCollectionAmount));
    }, [isOpen, detailCardData, initialCollectionAmount]);

    // Validate token when the dialog is opened. Cache the boolean in component state.
    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        (async () => {
            try {
                const valid = await validateToken();
                if (!cancelled) setIsTokenValid(Boolean(valid));
            } catch (e) {
                if (!cancelled) setIsTokenValid(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    const currentCollectionAmount = Number(collectionAmountInput);
    const showAddButton = canShowCollectionControls && currentCollectionAmount <= 0;

    const handleCollectionAmountChange = (event) => {
        const nextValue = event.target.value;
        setCollectionAmountInput(nextValue);

        const userId = getStoredAuthUser()?.id;
        const cardId = detailCardData?.raw?.id ?? detailCardData?.id;
        const nextCount = Number(nextValue);

        if (!userId || !cardId || !Number.isFinite(nextCount)) {
            return;
        }

        updateCollectionCard(userId, cardId, userId, nextCount)
            .then(() => {
                if (typeof onCollectionAmountUpdated === "function") {
                    onCollectionAmountUpdated(cardId, nextCount, detailCardData);
                }
            })
            .catch((error) => console.error(error));
    };

    const handleAddCardToCollection = () => {
        const nextCount = 1;
        setCollectionAmountInput(String(nextCount));

        const userId = getStoredAuthUser()?.id;
        const cardId = detailCardData?.raw?.id ?? detailCardData?.id;

        if (!userId || !cardId) {
            return;
        }

        updateCollectionCard(userId, cardId, userId, nextCount)
            .then(() => {
                if (typeof onCollectionAmountUpdated === "function") {
                    onCollectionAmountUpdated(cardId, nextCount, detailCardData);
                }
            })
            .catch((error) => console.error(error));
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="cardlist-dialog-overlay"
            role="dialog"
            aria-modal="true"
            onClick={onBack}
        >
            <div
                className="cardlist-dialog-modal"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="cardlist-dialog-detail">
                    <div className="cardlist-dialog-detail-header">
                        <button
                            type="button"
                            className="cardlist-dialog-back-btn"
                            onClick={onBack}
                            aria-label="Back to card list"
                        >
                            Back
                        </button>
                    </div>

                    {detailCardError && <p className="cardlist-status cardlist-error">{detailCardError}</p>}
                    {detailCardLoading && <p className="cardlist-status">Loading card details...</p>}

                    {detailCardData && (
                        <div className="cardlist-dialog-detail-content">
                            <div className="cardlist-dialog-detail-row-section">
                                <img
                                    src={detailCardData?.imageUrl || PlaceholderCardImage}
                                    alt={detailCardData?.name || "Card image"}
                                    className="cardlist-dialog-detail-image"
                                />
                                {canShowCollectionControls && (
                                    showAddButton ? (
                                        <button
                                            type="button"
                                            className="cardlist-dialog-detail-collection"
                                            onClick={handleAddCardToCollection}
                                        >
                                            Add card to collection
                                        </button>
                                    ) : (
                                        <label className="cardlist-dialog-detail-collection">
                                            <span>Amount in collection:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                inputMode="numeric"
                                                value={collectionAmountInput}
                                                onChange={handleCollectionAmountChange}
                                                aria-label="Amount in collection"
                                            />
                                        </label>
                                    )
                                )}
                            </div>
                            <div className="cardlist-dialog-detail-info">
                                <h2>{detailCardData?.name || "Card details"}</h2>

                                <dl className="cardlist-dialog-detail-specs">
                                    <dt>Card ID</dt>
                                    <dd>{detailCardData?.raw?.cardId ?? detailCardData?.cardId ?? "-"}</dd>

                                    <dt>Card Set</dt>
                                    <dd>{detailCardData?.raw?.cardSet ?? "-"}</dd>

                                    <dt>Type</dt>
                                    <dd>{detailCardData?.raw?.cardTypeName ?? "-"}</dd>

                                    <dt>Colour</dt>
                                    <dd>{detailCardData?.raw?.cardColour ?? "-"}</dd>

                                    <dt>Holomem</dt>
                                    <dd>{detailCardData?.raw?.holomem ?? "-"}</dd>

                                    <dt>Bloom Level</dt>
                                    <dd>{detailCardData?.raw?.bloomLvl ?? "-"}</dd>

                                    <dt>HP</dt>
                                    <dd>{detailCardData?.raw?.hp ?? "-"}</dd>

                                    <dt>Rarity</dt>
                                    <dd>{detailCardData?.raw?.rarity ?? "-"}</dd>

                                    <dt>Baton Pass</dt>
                                    <dd>{detailCardData?.raw?.batonpass ?? "-"}</dd>

                                    <dt>Extra Effect</dt>
                                    <dd>{detailCardData?.raw?.extraEffect ?? "-"}</dd>
                                </dl>

                                {Array.isArray(detailCardData?.raw?.keywords) && detailCardData.raw.keywords.length > 0 && (
                                    <div className="cardlist-dialog-detail-section">
                                        <h3>Keywords</h3>
                                        <ul className="cardlist-dialog-detail-list">
                                            {detailCardData.raw.keywords.map((keyword, index) => (
                                                <li key={keyword?.id ?? index}>
                                                    <strong>{keyword?.name || `Keyword ${index + 1}`}</strong>
                                                    <p>Type: {keyword.type}</p>
                                                    <p>Effect: {keyword.effect}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {Array.isArray(detailCardData?.raw?.tags) && detailCardData.raw.tags.length > 0 && (
                                    <div className="cardlist-dialog-detail-section">
                                        <h3>Tags</h3>
                                        <ul className="cardlist-dialog-detail-list">
                                            {detailCardData.raw.tags.map((tag, index) => (
                                                <li key={tag?.id ?? index}>{tag?.name || `Tag ${index + 1}`}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {Array.isArray(detailCardData?.raw?.arts) && detailCardData.raw.arts.length > 0 && (
                                    <div className="cardlist-dialog-detail-section">
                                        <h3>Arts</h3>
                                        <ul className="cardlist-dialog-detail-arts">
                                            {detailCardData.raw.arts.map((art, index) => (
                                                <li key={art?.id ?? index}>
                                                    <h4>{art?.name || `Art ${index + 1}`}</h4>
                                                    <p><strong>Damage:</strong> {art?.damage ?? "-"}</p>
                                                    {art?.critColourName && <p><strong>Crit:</strong> {art.critColourName}</p>}
                                                    {Array.isArray(art?.costs) && art.costs.length > 0 && (
                                                        <p><strong>Cost:</strong> {art.costs.map(c => c?.amount ?? "?").join(", ")}</p>
                                                    )}
                                                    {art?.effect && <p className="cardlist-dialog-detail-effect"><strong>Effect:</strong> {art.effect}</p>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
