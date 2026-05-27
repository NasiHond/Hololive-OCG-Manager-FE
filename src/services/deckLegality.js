const DEFAULT_MAIN_DECK_SIZE = 50;
const DEFAULT_CHEER_DECK_SIZE = 20;
const DEFAULT_MAX_COPIES = 4;

function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase();
}

function toNumber(value, fallback = 0) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getRawCardType(raw) {
    return raw?.cardTypeName ?? "";
}

function isOshiCard(raw) {
    const cardType = normalizeText(getRawCardType(raw));
    return cardType.includes("oshi");
}

function isCheerCard(raw) {
    const cardType = normalizeText(getRawCardType(raw));
    return cardType.includes("cheer");
}

function getMaxCopies(raw) {
    const rawLimit = raw?.maxCopiesAllowed ?? raw?.maxCopies ?? raw?.deckLimit;
    const limit = toNumber(rawLimit, DEFAULT_MAX_COPIES);

    return limit > 0 ? limit : DEFAULT_MAX_COPIES;
}

export const DECK_LEGALITY_CODES = {
    NO_OSHI_CARD: "NO_OSHI_CARD",
    INVALID_MAIN_DECK_SIZE: "INVALID_MAIN_DECK_SIZE",
    INVALID_CHEER_DECK_SIZE: "INVALID_CHEER_DECK_SIZE",
    TOO_MANY_COPIES: "TOO_MANY_COPIES",
};

export function checkDeckLegality(cards) {
    const violations = [];
    const counts = {
        main: 0,
        cheer: 0,
        oshi: 0,
        total: 0,
    };

    for (const card of cards) {
        const cardCount = toNumber(card?.cardCount ?? card?.count, 0);
        const raw = card?.raw ?? null;

        if (isOshiCard(raw)) {
            counts.oshi += cardCount;
        } else if (isCheerCard(raw)) {
            counts.cheer += cardCount;
        } else {
            counts.main += cardCount;
        }

        counts.total += cardCount;

        if (!isOshiCard(raw)) {
            const maxCopies = getMaxCopies(raw);
            if (cardCount > maxCopies) {
                if (raw.extraEffect !== "You may include any number of this holomem in the deck")
                {
                    violations.push({
                        code: DECK_LEGALITY_CODES.TOO_MANY_COPIES,
                        severity: "error",
                        message: `Card "${raw?.name ?? raw?.holomem ?? "Unknown card"} - ${raw?.cardID ?? ""}" has ${cardCount} copies, limit is ${maxCopies}.`,
                        cardId: card?.cardId ?? null,
                    });
                }

            }
        }
    }
//TODO IMPLEMENT OSHIS IN DATABASE
    // if (counts.oshi !== 1) {
    //     violations.push({
    //         code: DECK_LEGALITY_CODES.NO_OSHI_CARD,
    //         severity: "error",
    //         message: "Deck must contain exactly 1 Oshi card.",
    //     });
    // }

    if (counts.main !== DEFAULT_MAIN_DECK_SIZE) {
        violations.push({
            code: DECK_LEGALITY_CODES.INVALID_MAIN_DECK_SIZE,
            severity: "error",
            message: `Main deck must contain exactly ${DEFAULT_MAIN_DECK_SIZE} cards (currently ${counts.main}).`,
        });
    }
//TODO IMPLEMENT CHEERS IN DATABASE
    // if (counts.cheer !== DEFAULT_CHEER_DECK_SIZE) {
    //     violations.push({
    //         code: DECK_LEGALITY_CODES.INVALID_CHEER_DECK_SIZE,
    //         severity: "error",
    //         message: `Cheer deck must contain exactly ${DEFAULT_CHEER_DECK_SIZE} cards (currently ${counts.cheer}).`,
    //     });
    // }

    return {
        isLegal: violations.length === 0,
        violations,
        counts,
    };
}

