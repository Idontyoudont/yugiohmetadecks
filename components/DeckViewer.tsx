"use client";

import { useMemo, useState } from "react";
import { CardGrid } from "./CardGrid";
import { CardPreviewPanel } from "./CardPreviewPanel";
import { DeckFilters } from "./DeckFilters";
import { DeckSidebar } from "./DeckSidebar";
import { enrichDeckCard } from "../lib/enrichDeckCard";
import type { Deck, EnrichedDeckCard } from "../types/deck";

type DeckViewerProps = {
  decks: Deck[];
};

export function DeckViewer({ decks }: DeckViewerProps) {
  const [selectedDeckId, setSelectedDeckId] = useState(decks[0].id);
  const [selectedCard, setSelectedCard] = useState<EnrichedDeckCard | null>(
    null
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedDeck =
    decks.find((deck) => deck.id === selectedDeckId) ?? decks[0];

  const enrichedMainDeck = selectedDeck.mainDeck.map(enrichDeckCard);
  const enrichedExtraDeck = selectedDeck.extraDeck.map(enrichDeckCard);
  const enrichedSideDeck = selectedDeck.sideDeck.map(enrichDeckCard);

  const allCards = [
    ...enrichedMainDeck,
    ...enrichedExtraDeck,
    ...enrichedSideDeck,
  ];

  const availableTags = useMemo(() => {
    const tags = allCards.flatMap((card) => card.tags ?? []);
    return Array.from(new Set(tags)).sort();
  }, [allCards]);

  function filterCards(cards: EnrichedDeckCard[]) {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesTag = selectedTag ? card.tags?.includes(selectedTag) : true;
      const matchesSearch = normalizedSearchQuery
        ? card.name.toLowerCase().includes(normalizedSearchQuery)
        : true;

      return matchesTag && matchesSearch;
    });
  }

  const filteredMainDeck = filterCards(enrichedMainDeck);
  const filteredExtraDeck = filterCards(enrichedExtraDeck);
  const filteredSideDeck = filterCards(enrichedSideDeck);

  function handleSelectDeck(deckId: string) {
    setSelectedDeckId(deckId);
    setSelectedCard(null);
    setSelectedTag(null);
    setSearchQuery("");
  }

  function handleSelectTag(tag: string | null) {
    setSelectedTag(tag);
    setSelectedCard(null);
  }

  function handleSearchChange(query: string) {
    setSearchQuery(query);
    setSelectedCard(null);
  }

  return (
    <div className="flex min-h-screen">
      <DeckSidebar
        decks={decks}
        selectedDeck={selectedDeck}
        onSelectDeck={handleSelectDeck}
      />

      <section className="flex-1 overflow-y-auto p-8">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
            Selected deck
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white">
            {selectedDeck.name}
          </h2>
          <p className="mt-3 text-slate-300">
            {selectedDeck.year} · {selectedDeck.format}
          </p>
          <p className="mt-5 max-w-3xl text-slate-400">
            Search within the selected deck or filter cards by custom role tags.
          </p>
        </div>

        <DeckFilters
          availableTags={availableTags}
          selectedTag={selectedTag}
          searchQuery={searchQuery}
          onSelectTag={handleSelectTag}
          onSearchChange={handleSearchChange}
        />

        <div className="space-y-6">
          <CardGrid
            title="Main Deck"
            cards={filteredMainDeck}
            selectedCard={selectedCard}
            onSelectCard={setSelectedCard}
          />
          <CardGrid
            title="Extra Deck"
            cards={filteredExtraDeck}
            selectedCard={selectedCard}
            onSelectCard={setSelectedCard}
          />
          <CardGrid
            title="Side Deck"
            cards={filteredSideDeck}
            selectedCard={selectedCard}
            onSelectCard={setSelectedCard}
          />
        </div>
      </section>

      <CardPreviewPanel
  card={selectedCard}
  onClose={() => setSelectedCard(null)}
/>
    </div>
  );
}