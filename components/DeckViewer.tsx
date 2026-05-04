"use client";

import { useState } from "react";
import { CardGrid } from "./CardGrid";
import { CardPreviewPanel } from "./CardPreviewPanel";
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

  const selectedDeck =
    decks.find((deck) => deck.id === selectedDeckId) ?? decks[0];

  const enrichedMainDeck = selectedDeck.mainDeck.map(enrichDeckCard);
  const enrichedExtraDeck = selectedDeck.extraDeck.map(enrichDeckCard);
  const enrichedSideDeck = selectedDeck.sideDeck.map(enrichDeckCard);

  function handleSelectDeck(deckId: string) {
    setSelectedDeckId(deckId);
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
            This is the first interactive layout test for the Yu-Gi-Oh meta deck
            viewer. Card details are now stored separately from deck lists, so
            the app is easier to maintain and later connect to an API.
          </p>
        </div>

        <div className="space-y-6">
          <CardGrid
            title="Main Deck"
            cards={enrichedMainDeck}
            selectedCard={selectedCard}
            onSelectCard={setSelectedCard}
          />
          <CardGrid
            title="Extra Deck"
            cards={enrichedExtraDeck}
            selectedCard={selectedCard}
            onSelectCard={setSelectedCard}
          />
          <CardGrid
            title="Side Deck"
            cards={enrichedSideDeck}
            selectedCard={selectedCard}
            onSelectCard={setSelectedCard}
          />
        </div>
      </section>

      <CardPreviewPanel card={selectedCard} />
    </div>
  );
}