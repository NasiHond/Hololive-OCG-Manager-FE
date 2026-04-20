const CARDS_ENDPOINT = "http://localhost:8080/api/cards";

function toNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function normalizeCard(rawCard) {
    const id = rawCard?.Id ?? rawCard?.id ?? rawCard?.cardId ?? null;
    const name = rawCard?.holomem ?? rawCard?.cardId ?? "Unknown card";
    const imageUrl = rawCard?.imageURL ?? rawCard?.imageUrl ?? rawCard?.image ?? "";

    return {
        id,
        name,
        imageUrl,
        raw: rawCard,
    };
}

export async function fetchCardsPage({ page = 0, size = 20, signal } = {}) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });

    const response = await fetch(`${CARDS_ENDPOINT}?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        signal,
    });

    if (!response.ok) {
        const error = new Error(`Failed to load cards (HTTP ${response.status})`);
        error.status = response.status;
        throw error;
    }

    const payload = await response.json();
    const content = Array.isArray(payload?.content) ? payload.content : [];
    const totalPages = toNumber(payload?.totalPages, 0);
    const currentPage = toNumber(payload?.number, page);

    const hasMore =
        typeof payload?.last === "boolean"
            ? !payload.last
            : currentPage + 1 < totalPages;

    return {
        cards: content.map(normalizeCard),
        page: currentPage,
        hasMore,
    };
}


