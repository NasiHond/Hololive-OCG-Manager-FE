import { getAuthHeaders } from "./usersApi.js";

const COLLECTIONS_ENDPOINT = "http://localhost:8080/api/collections";
const COLLECTION_SEARCH_ENDPOINT = `${COLLECTIONS_ENDPOINT}/search`;

function toNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function normalizeCollectionCard(rawCard) {
    const id = rawCard?.id ?? null;
    const cardId = rawCard?.cardId ?? null;
    const name = rawCard?.name ?? "Unknown card";
    const imageUrl = rawCard?.imageUrl ?? rawCard?.imageURL ?? "";
    const cardCount = toNumber(rawCard?.cardCount, 1);
    const collectionCardId = rawCard?.collectionCardId ?? null;

    return {
        id,
        cardId,
        collectionCardId,
        name,
        imageUrl,
        cardCount,
        raw: rawCard,
    };
}

export async function fetchCollection(
    userId,
    { page = 0, size = 20, signal } = {}
) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });

    const response = await fetch(
        `${COLLECTIONS_ENDPOINT}/${encodeURIComponent(String(userId))}`,
        {
            method: "GET",
            headers: getAuthHeaders(),
            signal,
        }
    );

    if (!response.ok) {
        const error = new Error(`Failed to load collection (HTTP ${response.status})`);
        error.status = response.status;
        throw error;
    }

    const payload = await response.json();
    const collection = {
        id: payload?.collection?.id ?? null,
        ownerId: payload?.collection?.ownerId ?? null,
        visibility: payload?.collection?.visibility ?? "private",
        totalCards: toNumber(payload?.collection?.totalCards, 0),
        totalCount: toNumber(payload?.collection?.totalCount, 0),
    };

    const cards = Array.isArray(payload?.cards)
        ? payload.cards.map(normalizeCollectionCard)
        : [];

    const totalPages = toNumber(payload?.totalPages, 0);
    const currentPage = toNumber(payload?.page, page);

    const hasMore =
        typeof payload?.last === "boolean"
            ? !payload.last
            : currentPage + 1 < totalPages;

    return {
        collection,
        cards,
        page: currentPage,
        hasMore,
    };
}

export async function fetchCollectionCardCount(userId, cardId)
{
    const response = await fetch(
        `${COLLECTIONS_ENDPOINT}/${encodeURIComponent(String(userId))}/${encodeURIComponent(cardId)}`,
        {
            method: "GET",
            headers: getAuthHeaders(),
        }
    );

    const payload = await response.json();

    if (!response.ok) {
        const error = new Error(`Failed to load collection card count (HTTP ${response.status})`);
        error.status = response.status;
        throw error;
    }

    return toNumber(payload?.cardCount, 0);
}