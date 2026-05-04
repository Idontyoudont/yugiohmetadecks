"use client";

import { useState } from "react";
import { CardGrid } from "./CardGrid";
import { DeckSidebar } from "./DeckSidebar";
import type { Deck } from "../types/deck";

type DeckViewerProps = {
  decks: Deck[];
};

export function DeckViewer({ decks }: DeckViewerProps) {
  const [selectedDeckId, setSelectedDeckId] = useState(decks[0].id);

  const selectedDeck =
    decks.find((deck) => deck.id === selectedDeckId) ?? decks[0];

  return (
    <div className="flex min-h-screen">
      <DeckSidebar
        decks={decks}
        selectedDeck={selectedDeck}
        onSelectDeck={setSelectedDeckId}
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
            viewer. You can now switch between decks from the sidebar. Later,
            each card can show its real image, effect text, attributes, sets,
            and custom role tags.
          </p>
        </div>

        <div className="space-y-6">
          <CardGrid title="Main Deck" cards={selectedDeck.mainDeck} />
          <CardGrid title="Extra Deck" cards={selectedDeck.extraDeck} />
          <CardGrid title="Side Deck" cards={selectedDeck.sideDeck} />
        </div>
      </section>
    </div>
  );
}