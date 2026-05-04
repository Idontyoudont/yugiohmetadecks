"use client";

import { useMemo, useState } from "react";
import { deckVariants } from "../data/deckVariants";
import { applyDeckVariant } from "../lib/applyDeckVariant";
import { enrichDeckCard } from "../lib/enrichDeckCard";
import { CardGrid } from "./CardGrid";
import { CardPreviewPanel } from "./CardPreviewPanel";
import { DeckFilters } from "./DeckFilters";
import { DeckNotes } from "./DeckNotes";
import { DeckPackSummary } from "./DeckPackSummary";
import { DeckSidebar } from "./DeckSidebar";
import { DeckSourceCoverage } from "./DeckSourceCoverage";
import { DeckStats } from "./DeckStats";
import { DeckValidation } from "./DeckValidation";
import { DeckVariantChanges } from "./DeckVariantChanges";
import { DeckVariantSelector } from "./DeckVariantSelector";
import { MissingSourceChecklist } from "./MissingSourceChecklist";
import type { CardGameSourceInfo, Deck, EnrichedDeckCard } from "../types/deck";

type DeckViewerProps = {
  decks: Deck[];
};

type SourceStatusFilter = CardGameSourceInfo["status"] | "missing" | null;

function getDeckStatusLabel(status: Deck["status"]) {
  if (status === "complete") {
    return "Complete deck";
  }

  if (status === "sample") {
    return "Sample deck";
  }

  return "Draft deck";
}

function getDeckStatusClassName(status: Deck["status"]) {
  if (status === "complete") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "sample") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  }

  return "border-slate-600 bg-slate-800 text-slate-300";
}

function getCardPackNames(card: EnrichedDeckCard) {
  if (card.gameSourceInfo?.status !== "available") {
    return [];
  }

  return card.gameSourceInfo.sources?.map((source) => source.packName) ?? [];
}

function matchesSourceStatus(
  card: EnrichedDeckCard,
  selectedSourceStatus: SourceStatusFilter
) {
  if (!selectedSourceStatus) {
    return true;
  }

  if (selectedSourceStatus === "missing") {
    return !card.gameSourceInfo;
  }

  return card.gameSourceInfo?.status === selectedSourceStatus;
}

function matchesPack(card: EnrichedDeckCard, selectedPack: string | null) {
  if (!selectedPack) {
    return true;
  }

  return getCardPackNames(card).includes(selectedPack);
}

function getVisibleDecks(decks: Deck[], showSampleDecks: boolean) {
  if (showSampleDecks) {
    return decks;
  }

  return decks.filter((deck) => deck.status !== "sample");
}

export function DeckViewer({ decks }: DeckViewerProps) {
  const [showSampleDecks, setShowSampleDecks] = useState(false);

  const visibleDecks = getVisibleDecks(decks, showSampleDecks);
  const fallbackDeck = visibleDecks[0] ?? decks[0];
  const sampleDeckCount = decks.filter((deck) => deck.status === "sample").length;

  const [selectedDeckId, setSelectedDeckId] = useState(fallbackDeck.id);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  );
  const [selectedCard, setSelectedCard] = useState<EnrichedDeckCard | null>(
    null
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSourceStatus, setSelectedSourceStatus] =
    useState<SourceStatusFilter>(null);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedDeck =
    visibleDecks.find((deck) => deck.id === selectedDeckId) ?? fallbackDeck;

  const availableVariants = deckVariants.filter(
    (variant) => variant.deckId === selectedDeck.id
  );

  const selectedVariant =
    availableVariants.find((variant) => variant.id === selectedVariantId) ??
    null;

  const activeDeckCards = applyDeckVariant(selectedDeck, selectedVariant);

  const enrichedMainDeck = activeDeckCards.mainDeck.map(enrichDeckCard);
  const enrichedExtraDeck = activeDeckCards.extraDeck.map(enrichDeckCard);
  const enrichedSideDeck = activeDeckCards.sideDeck.map(enrichDeckCard);

  const allCards = [
    ...enrichedMainDeck,
    ...enrichedExtraDeck,
    ...enrichedSideDeck,
  ];

  const availableTags = useMemo(() => {
    const tags = allCards.flatMap((card) => card.tags ?? []);
    return Array.from(new Set(tags)).sort();
  }, [allCards]);

  const availablePacks = useMemo(() => {
    const packs = allCards.flatMap(getCardPackNames);
    return Array.from(new Set(packs)).sort();
  }, [allCards]);

  function filterCards(cards: EnrichedDeckCard[]) {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesTag = selectedTag ? card.tags?.includes(selectedTag) : true;
      const matchesSearch = normalizedSearchQuery
        ? card.name.toLowerCase().includes(normalizedSearchQuery)
        : true;
      const matchesSource = matchesSourceStatus(card, selectedSourceStatus);
      const matchesSelectedPack = matchesPack(card, selectedPack);

      return matchesTag && matchesSearch && matchesSource && matchesSelectedPack;
    });
  }

  const filteredMainDeck = filterCards(enrichedMainDeck);
  const filteredExtraDeck = filterCards(enrichedExtraDeck);
  const filteredSideDeck = filterCards(enrichedSideDeck);

  function resetFiltersAndSelection() {
    setSelectedCard(null);
    setSelectedTag(null);
    setSelectedSourceStatus(null);
    setSelectedPack(null);
    setSearchQuery("");
  }

  function handleSelectDeck(deckId: string) {
    setSelectedDeckId(deckId);
    setSelectedVariantId(null);
    resetFiltersAndSelection();
  }

  function handleToggleShowSampleDecks() {
    const nextShowSampleDecks = !showSampleDecks;
    const nextVisibleDecks = getVisibleDecks(decks, nextShowSampleDecks);
    const selectedDeckStillVisible = nextVisibleDecks.some(
      (deck) => deck.id === selectedDeckId
    );

    setShowSampleDecks(nextShowSampleDecks);

    if (!selectedDeckStillVisible && nextVisibleDecks[0]) {
      setSelectedDeckId(nextVisibleDecks[0].id);
      setSelectedVariantId(null);
      resetFiltersAndSelection();
    }
  }

  function handleSelectVariant(variantId: string | null) {
    setSelectedVariantId(variantId);
    resetFiltersAndSelection();
  }

  function handleSelectTag(tag: string | null) {
    setSelectedTag(tag);
    setSelectedCard(null);
  }

  function handleSelectSourceStatus(status: SourceStatusFilter) {
    setSelectedSourceStatus(status);
    setSelectedCard(null);
  }

  function handleSelectPack(pack: string | null) {
    setSelectedPack(pack);
    setSelectedCard(null);
  }

  function handleSearchChange(query: string) {
    setSearchQuery(query);
    setSelectedCard(null);
  }

  function handlePreviewCard(card: EnrichedDeckCard) {
    setSelectedCard(card);
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <DeckSidebar
        decks={visibleDecks}
        selectedDeck={selectedDeck}
        showSampleDecks={showSampleDecks}
        sampleDeckCount={sampleDeckCount}
        onToggleShowSampleDecks={handleToggleShowSampleDecks}
        onSelectDeck={handleSelectDeck}
      />

      <main className="min-h-screen flex-1 bg-slate-950 p-8">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
            Selected deck
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-bold text-white">
              {selectedDeck.name}
            </h2>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getDeckStatusClassName(
                selectedDeck.status
              )}`}
            >
              {getDeckStatusLabel(selectedDeck.status)}
            </span>

            {selectedVariant ? (
              <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-300">
                {selectedVariant.name}
              </span>
            ) : null}
          </div>

          <p className="mt-3 text-slate-300">
            {selectedDeck.year} · {selectedDeck.format}
          </p>

          <p className="mt-5 max-w-3xl text-slate-400">
            Search within the selected deck, filter by custom role tags, or
            inspect in-game source coverage.
          </p>

          {availableVariants.length > 0 ? (
            <DeckVariantSelector
              variants={availableVariants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={handleSelectVariant}
            />
          ) : null}

          <DeckVariantChanges variant={selectedVariant} />

          <DeckStats
            mainDeck={filteredMainDeck}
            extraDeck={filteredExtraDeck}
            sideDeck={filteredSideDeck}
          />

          <DeckValidation
            mainDeck={enrichedMainDeck}
            extraDeck={enrichedExtraDeck}
            sideDeck={enrichedSideDeck}
          />

          <DeckSourceCoverage
            mainDeck={enrichedMainDeck}
            extraDeck={enrichedExtraDeck}
            sideDeck={enrichedSideDeck}
          />

          <DeckNotes
            mainDeck={enrichedMainDeck}
            extraDeck={enrichedExtraDeck}
            sideDeck={enrichedSideDeck}
          />

          <DeckPackSummary
            mainDeck={enrichedMainDeck}
            extraDeck={enrichedExtraDeck}
            sideDeck={enrichedSideDeck}
            selectedPack={selectedPack}
            onSelectPack={handleSelectPack}
          />

          <MissingSourceChecklist
            mainDeck={enrichedMainDeck}
            extraDeck={enrichedExtraDeck}
            sideDeck={enrichedSideDeck}
            onSelectCard={setSelectedCard}
          />
        </div>

        <DeckFilters
          availableTags={availableTags}
          availablePacks={availablePacks}
          selectedTag={selectedTag}
          selectedSourceStatus={selectedSourceStatus}
          selectedPack={selectedPack}
          searchQuery={searchQuery}
          onSelectTag={handleSelectTag}
          onSelectSourceStatus={handleSelectSourceStatus}
          onSelectPack={handleSelectPack}
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
      </main>

      <CardPreviewPanel
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onPreviewCard={handlePreviewCard}
      />
    </div>
  );
}