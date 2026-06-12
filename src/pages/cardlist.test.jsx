import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import CardList from "./CardList";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as cardsApi from "../services/cardsApi";

// Mock the API module
vi.mock("../services/cardsApi");

// Mock Navbar and CardDetailDialog to isolate the unit under test
vi.mock("../components/Navbar", () => ({
    default: () => <nav data-testid="navbar" />,
}));
vi.mock("../components/CardDetailDialog", () => ({
    default: () => null,
}));

const makeFakeCards = (count) =>
    Array.from({ length: count }, (_, i) => ({
        id: `card-${i}`,
        cardId: `HOLO-${i}`,
        name: `Card ${i}`,
        imageUrl: "",
    }));

describe("CardList", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
    });

    it("renders a page of 20 cards", async () => {
        cardsApi.fetchCardsPage.mockResolvedValueOnce({
            cards: makeFakeCards(20),
            hasMore: false,
        });

        render(<CardList />);

        // Loading state is shown while fetching
        expect(screen.getByText("Loading cards...")).toBeInTheDocument();

        // Wait for cards to appear
        await waitFor(() => {
            expect(screen.getAllByRole("button", { name: /Card \d+ - HOLO-\d+/i })).toHaveLength(20);
        });

        // Loading indicator is gone
        expect(screen.queryByText("Loading cards...")).not.toBeInTheDocument();

        // End-of-list message appears since hasMore is false
        expect(screen.getByText("No more cards to load.")).toBeInTheDocument();

        // Result count is shown
        expect(screen.getByText("Showing 20 results")).toBeInTheDocument();
    });

    it("shows an error message when the API fails", async () => {
        cardsApi.fetchCardsPage.mockRejectedValueOnce(new Error("Network error"));

        render(<CardList />);

        await waitFor(() => {
            expect(screen.getByText("Network error")).toBeInTheDocument();
        });
    });

    it("shows the empty state when no cards are returned", async () => {
        cardsApi.fetchCardsPage.mockResolvedValueOnce({
            cards: [],
            hasMore: false,
        });

        render(<CardList />);

        await waitFor(() => {
            expect(screen.getByText("Showing 0 results")).toBeInTheDocument();
        });

        // Neither the end message nor cards should appear
        expect(screen.queryByText("No more cards to load.")).not.toBeInTheDocument();
        expect(screen.queryAllByRole("button", { name: /Card/ })).toHaveLength(1);
    });
});