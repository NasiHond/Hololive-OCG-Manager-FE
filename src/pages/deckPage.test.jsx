import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeckPage from "./DeckPage";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as deckApi from "../services/deckApi";
import * as usersApi from "../services/usersApi";
import * as websocket from "../services/websocket";

vi.mock("react-router-dom", () => ({
    useParams: () => ({ deckId: "deck-123" }),
}));

vi.mock("../services/deckApi");
vi.mock("../services/usersApi");
vi.mock("../services/websocket");

vi.mock("../components/Navbar", () => ({ default: () => <nav data-testid="navbar" /> }));
vi.mock("../components/CardDetailDialog", () => ({ default: () => null }));
vi.mock("../components/AddCardDialog", () => ({ default: () => null }));
vi.mock("react-simple-star-rating", () => ({
    Rating: () => <span data-testid="star-rating" />,
}));

const makeFakeDeck = (overrides = {}) => ({
    id: "deck-123",
    title: "Test Deck",
    description: "A test deck",
    ownerId: "user-1",
    ownerName: "TestOwner",
    visibility: "Public",
    raw: {},
    ...overrides,
});

const makeFakeCard = (i, overrides = {}) => ({
    id: `card-${i}`,
    cardId: `HOLO-${i}`,
    name: `Card ${i}`,
    imageUrl: "",
    cardCount: 2,
    raw: {
        id: `card-${i}`,
        holomem: `Holomem ${i}`,
        cardTypeName: "holomem",
        extraEffect: "You may include any number of this holomem in the deck"
    },
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    // Default: not logged in
    usersApi.getStoredAuthUser.mockReturnValue(null);
    // Default: no-op websocket
    websocket.connectWebSocket.mockReturnValue({ subscribe: vi.fn() });
});

describe("DeckPage — display", () => {
    it("renders deck info and cards after loading", async () => {
        deckApi.fetchDeckPage.mockResolvedValueOnce({
            deck: makeFakeDeck(),
            cards: [makeFakeCard(0), makeFakeCard(1)],
        });

        render(<DeckPage />);

        expect(screen.getByText("Loading deck...")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText("Test Deck")).toBeInTheDocument();
        });

        expect(screen.getByText(/TestOwner/)).toBeInTheDocument();
        expect(screen.getByText(/Public/)).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: /Holomem \d+ - HOLO-\d+/i })).toHaveLength(2);
        expect(screen.queryByText("Loading deck...")).not.toBeInTheDocument();
    });

    it("shows empty state when deck has no cards", async () => {
        deckApi.fetchDeckPage.mockResolvedValueOnce({
            deck: makeFakeDeck(),
            cards: [],
        });

        render(<DeckPage />);

        await waitFor(() => {
            expect(screen.getByText("No cards found in this deck.")).toBeInTheDocument();
        });
    });

    it("shows error message when API fails", async () => {
        deckApi.fetchDeckPage.mockRejectedValueOnce(new Error("Network error"));

        render(<DeckPage />);

        await waitFor(() => {
            expect(screen.getByText("Network error")).toBeInTheDocument();
        });
    });

    it("shows correct total card count", async () => {
        deckApi.fetchDeckPage.mockResolvedValueOnce({
            deck: makeFakeDeck(),
            // 2 cards, each with cardCount: 2, so total = 4
            cards: [makeFakeCard(0), makeFakeCard(1)],
        });

        render(<DeckPage />);

        await waitFor(() => {
            expect(screen.getByTestId("totalCardCount")).toHaveTextContent("4");
        });
    });
});

describe("DeckPage — owner controls", () => {
    it("shows add/remove buttons when user is deck owner", async () => {
        usersApi.getStoredAuthUser.mockReturnValue({ id: "user-1" });
        deckApi.fetchDeckPage.mockResolvedValueOnce({
            deck: makeFakeDeck({ ownerId: "user-1" }),
            cards: [makeFakeCard(0)],
        });

        render(<DeckPage />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "-" })).toBeInTheDocument();
        });
    });

    it("hides add/remove buttons when user is not deck owner", async () => {
        usersApi.getStoredAuthUser.mockReturnValue({ id: "user-99" });
        deckApi.fetchDeckPage.mockResolvedValueOnce({
            deck: makeFakeDeck({ ownerId: "user-1" }),
            cards: [makeFakeCard(0)],
        });

        render(<DeckPage />);

        await waitFor(() => {
            expect(screen.queryByRole("button", { name: "+" })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "-" })).not.toBeInTheDocument();
        });
    });

    it("increments card count when + is clicked", async () => {
        usersApi.getStoredAuthUser.mockReturnValue({ id: "user-1" });
        deckApi.fetchDeckPage.mockResolvedValueOnce({
            deck: makeFakeDeck({ ownerId: "user-1" }),
            cards: [makeFakeCard(0, { cardCount: 2 })],
        });
        deckApi.updateDeckCard.mockResolvedValue({});

        render(<DeckPage />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument();
        });

        // Card count overlay shows 2 initially
        expect(screen.getByTestId("card-count-card-0")).toHaveTextContent("2");

        await userEvent.click(screen.getByRole("button", { name: "+" }));

        expect(screen.getByTestId("card-count-card-0")).toHaveTextContent("3");
    });

    it("decrements card count when - is clicked", async () => {
        usersApi.getStoredAuthUser.mockReturnValue({ id: "user-1" });
        deckApi.fetchDeckPage.mockResolvedValueOnce({
            deck: makeFakeDeck({ ownerId: "user-1" }),
            cards: [makeFakeCard(0, { cardCount: 2 })],
        });
        deckApi.updateDeckCard.mockResolvedValue({});

        render(<DeckPage />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "-" })).toBeInTheDocument();
        });

        expect(screen.getByTestId("card-count-card-0")).toHaveTextContent("2");

        await userEvent.click(screen.getByRole("button", { name: "-" }));

        expect(screen.getByTestId("card-count-card-0")).toHaveTextContent("1");
    });
});

describe("DeckPage — legality", () => {
    it("shows Legal status when deck is legal", async () => {
        deckApi.fetchDeckPage.mockResolvedValueOnce({
            deck: makeFakeDeck(),
            cards: [makeFakeCard(50, { cardTypeName: "holomem" })],
        });

        render(<DeckPage />);

        await waitFor(() => {
            const legalityEl = document.querySelector(".deck-legality-status");
            expect(legalityEl).toBeInTheDocument();
            expect(legalityEl).toHaveTextContent("Legal Status:");
            expect(legalityEl).toHaveTextContent("Legal");
        });
    });
});