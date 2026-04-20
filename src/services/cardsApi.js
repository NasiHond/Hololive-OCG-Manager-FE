const CARDS_ENDPOINT = "http://localhost:8080/api/cards";
const CARD_SEARCH_ENDPOINT = `${CARDS_ENDPOINT}/search`;

function toNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function normalizeCard(rawCard) {
    const id = rawCard?.Id ?? rawCard?.id ?? rawCard?.cardId ?? null;
    const cardId = rawCard?.cardId ?? rawCard?.Id ?? rawCard?.id ?? null;
    const name = rawCard?.holomem ?? rawCard?.cardId ?? "Unknown card";
    const imageUrl = rawCard?.imageURL ?? rawCard?.imageUrl ?? rawCard?.image ?? "";

    return {
        id,
        cardId,
        name,
        imageUrl,
        raw: rawCard,
    };
}

export async function fetchCardsPage({ page = 0, size = 20, signal } = {}) {
    return fetchCardsCollection(CARDS_ENDPOINT, { page, size, signal });
}

export async function fetchCardsSearchPage({
    page = 0,
    size = 20,
    cardName = "",
    bloomLvl = "",
    colour = "",
    cardSet = "",
    rarity = "",
    cardType = "",
    holomem = "",
    parallel = "",
    signal,
} = {}) {
    return fetchCardsCollection(CARD_SEARCH_ENDPOINT, {
        page,
        size,
        cardName,
        bloomLvl,
        colour,
        cardSet,
        rarity,
        cardType,
        holomem,
        parallel,
        signal,
    });
}

async function fetchCardsCollection(
    endpoint,
    {
        page = 0,
        size = 20,
        cardName = "",
        bloomLvl = "",
        colour = "",
        cardSet = "",
        rarity = "",
        cardType = "",
        holomem = "",
        parallel = "",
        signal,
    } = {}
) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });

    const appendIfPresent = (key, value) => {
        if (typeof value === "string" && value.trim() !== "") {
            params.set(key, value.trim());
        }
    };

    appendIfPresent("cardName", cardName);
    appendIfPresent("bloomLvl", bloomLvl);
    appendIfPresent("colour", colour);
    appendIfPresent("cardSet", cardSet);
    appendIfPresent("rarity", rarity);
    appendIfPresent("cardType", cardType);
    appendIfPresent("holomem", holomem);
    appendIfPresent("parallel", parallel);

    const response = await fetch(`${endpoint}?${params.toString()}`, {
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


