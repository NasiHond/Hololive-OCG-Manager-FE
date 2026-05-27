import { getAuthHeaders } from "./usersApi.js";

const DECK_ENDPOINT = "http://localhost:8080/api/decks";

function toNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function normalizeDeck(rawDeck) {
    return {
        id: rawDeck?.id ?? rawDeck?.Id ?? null,
        title: rawDeck?.title ?? rawDeck?.name ?? "Untitled deck",
        description: rawDeck?.description ?? rawDeck?.deckDescription ?? "",
        ownerId: rawDeck?.ownerId ?? rawDeck?.ownerID ?? null,
        ownerName: rawDeck?.ownerName ?? rawDeck?.creatorName ?? "Unknown",
        deckImageUrl: rawDeck?.deckImageUrl ?? rawDeck?.imageUrl ?? rawDeck?.image ?? "",
        visibility: rawDeck?.visibility ?? null,
        raw: rawDeck,
    };
}

function normalizeDeckCard(rawCard) {
    const id = rawCard?.id ?? null;
    const deckId = rawCard?.deckId ?? rawCard?.deckID ?? null;
    const cardId = rawCard?.cardID ?? rawCard?.cardId ?? null;
    const name = rawCard?.name ?? rawCard?.cardName ?? cardId ?? "Unknown card";
    const imageUrl = rawCard?.imageURL ?? rawCard?.imageUrl ?? "";
    const cardCount = toNumber(rawCard?.count, 1);

    return {
        id,
        deckId,
        cardId,
        name,
        imageUrl,
        cardCount,
        raw: rawCard,
    };
}

function normalizeDeckCardEntry(rawCard) {
    return {
        id: rawCard?.id ?? null,
        deckId: rawCard?.deckId ?? rawCard?.deckID ?? null,
        count: toNumber(rawCard?.count, 1),
        cardId: rawCard?.cardID ?? rawCard?.cardId ?? null,
        raw: rawCard,
    };
}

export async function fetchDecks({ page = 0, size: pageSize = 20, signal } = {}) {
    const normalizedPageSize = Number(pageSize);
    const params = new URLSearchParams({
        page: String(page),
        size: String(normalizedPageSize),
    });

    const response = await fetch(`${DECK_ENDPOINT}?${params.toString()}`, {
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
    let content = [];

    if (Array.isArray(payload)) {
        content = payload;
    } else if (Array.isArray(payload?.content)) {
        content = payload.content;
    }
    const totalPages = toNumber(payload?.totalPages, 0);
    const currentPage = toNumber(payload?.number, page);

    let hasMore = currentPage + 1 < totalPages;
    if (typeof payload?.last === "boolean") {
        hasMore = !payload.last;
    }

    return {
        decks: content.map(normalizeDeck),
        page: currentPage,
        hasMore,
    };
}

export async function fetchDecksFromUser(userId, { page = 0, size: pageSize = 20, signal } = {}) {
    const normalizedPageSize = Number(pageSize);
    const params = new URLSearchParams({
        page: String(page),
        size: String(normalizedPageSize),
    });

    const response = await fetch(`${DECK_ENDPOINT}/users/${userId}?${params.toString()}`, {
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
    let content = [];

    if (Array.isArray(payload)) {
        content = payload;
    } else if (Array.isArray(payload?.content)) {
        content = payload.content;
    }
    const totalPages = toNumber(payload?.totalPages, 0);
    const currentPage = toNumber(payload?.number, page);

    let hasMore = currentPage + 1 < totalPages;
    if (typeof payload?.last === "boolean") {
        hasMore = !payload.last;
    }

    return {
        decks: content.map(normalizeDeck),
        page: currentPage,
        hasMore,
    };
}

export async function fetchDeckPage(deckId, { signal } = {}) {
    const response = await fetch(
        `${DECK_ENDPOINT}/${encodeURIComponent(String(deckId))}`,
        {
            method: "GET",
            headers: getAuthHeaders(),
            signal,
        }
    );

    if (!response.ok) {
        const error = new Error(`Failed to load deck (HTTP ${response.status})`);
        error.status = response.status;
        throw error;
    }

    const payload = await response.json();
    const deck = normalizeDeck(payload?.deck);
    let cards = [];

    if (Array.isArray(payload?.cards)) {
        cards = payload.cards.map(normalizeDeckCard);
    }

    return {
        deck,
        cards,
    };
}

export async function fetchDeckCardsByCardId(cardId, { signal } = {}) {
    const response = await fetch(
        `${DECK_ENDPOINT}/cards/${encodeURIComponent(String(cardId))}`,
        {
            method: "GET",
            headers: getAuthHeaders(),
            signal,
        }
    );

    if (!response.ok) {
        const error = new Error(`Failed to load deck cards (HTTP ${response.status})`);
        error.status = response.status;
        throw error;
    }

    const payload = await response.json();
    const content = Array.isArray(payload) ? payload : [];

    return content.map(normalizeDeckCardEntry);
}

export async function updateDeckCard(deckId, cardId, count, signal) {
    const response = await fetch(
        `${DECK_ENDPOINT}/${encodeURIComponent(String(deckId))}/cards`,
        {
            method: "PUT",
            headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json",
            },
            signal,
            body: JSON.stringify({
                cardId,
                count,
            }),
        }
    );

    const responseText = await response.text();
    let payload = null;

    if (responseText) {
        try {
            payload = JSON.parse(responseText);
        } catch {
            payload = responseText;
        }
    }

    if (response.status !== 200) {
        const error = new Error(`Failed to update deck (HTTP ${response.status})`);
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload;
}