import { getAuthHeaders } from "./usersApi.js";

const DECK_ENDPOINT = "http://localhost:8080/api/decks";

function toNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function normalizeDeck(rawDeck) {
    return {
        id: rawDeck?.id ?? rawDeck?.Id ?? null,
        title: rawDeck?.title ?? rawDeck?.name ?? "Untitled deck",
        ownerId: rawDeck?.ownerId ?? rawDeck?.ownerID ?? null,
        ownerName: rawDeck?.ownerName ?? rawDeck?.creatorName ?? "Unknown",
        deckImageUrl: rawDeck?.deckImageUrl ?? rawDeck?.imageUrl ?? rawDeck?.image ?? "",
        visibility: rawDeck?.visibility ?? null,
        raw: rawDeck,
    };
}

export async function fetchDecksFromUser(userId, { page = 0, size = 20, signal } = {}) {
    const response = await fetch(`${DECK_ENDPOINT}/users/${userId}`, {
        method: "GET",
        headers: getAuthHeaders(),
        signal,
    });

    if (!response.ok) {
        const error = new Error(`Failed to load decks (HTTP ${response.status})`);
        error.status = response.status;
        throw error;
    }

    const payload = await response.json();
    const content = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.content)
            ? payload.content
            : [];
    const totalPages = toNumber(payload?.totalPages, 0);
    const currentPage = toNumber(payload?.number, page);

    const hasMore = typeof payload?.last === "boolean"
        ? !payload.last
        : currentPage + 1 < totalPages;

    return {
        decks: content.map(normalizeDeck),
        page: currentPage,
        hasMore,
    };
}