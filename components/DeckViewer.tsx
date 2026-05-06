"use client";

import { useEffect, useMemo, useState } from "react";
import { deckVariants as manualDeckVariants } from "../data/deckVariants";
import { applyDeckVariant } from "../lib/applyDeckVariant";
import { enrichDeckCard } from "../lib/enrichDeckCard";
import { generateSwitchDeckVariant } from "../lib/generateSwitchDeckVariant";
import { CardGrid } from "./CardGrid";
import { CardPreviewPanel } from "./CardPreviewPanel";
import { CardSearch } from "./CardSearch";
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
import type {
  CardGameSourceInfo,
  Deck,
  DeckVariant,
  EnrichedDeckCard,
} from "../types/deck";

type DeckViewerProps = {
  decks: Deck[];
};

type SourceStatusFilter = CardGameSourceInfo["status"] | "missing" | null;
type YearFilter = number | "all";
type CardSection = "Main Deck" | "Extra Deck" | "Side Deck";
type CompletionFilter = "all" | "remaining" | "done";

const CARD_COMPLETION_STORAGE_KEY = "yugiohmetadecks.cardCompletion.v1";

function getStoredDoneCardKeysByScope() {
  if (typeof window === "undefined") {
    return {};
  }

  const storedCompletion = window.localStorage.getItem(
    CARD_COMPLETION_STORAGE_KEY
  );

  if (!storedCompletion) {
    return {};
  }

  try {
    const parsedCompletion = JSON.parse(storedCompletion);

    if (parsedCompletion && typeof parsedCompletion === "object") {
      return parsedCompletion as Record<string, string[]>;
    }
  } catch {
    window.localStorage.removeItem(CARD_COMPLETION_STORAGE_KEY);
  }

  return {};
}

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

function getVisibleDecks(
  decks: Deck[],
  showSampleDecks: boolean,
  selectedYear: YearFilter
) {
  return decks.filter((deck) => {
    const matchesSampleFilter = showSampleDecks || deck.status !== "sample";
    const matchesYearFilter = selectedYear === "all" || deck.year === selectedYear;

    return matchesSampleFilter && matchesYearFilter;
  });
}

function getYearCounts(decks: Deck[], showSampleDecks: boolean) {
  return decks.reduce<Record<number, number>>((counts, deck) => {
    if (!showSampleDecks && deck.status === "sample") {
      return counts;
    }

    counts[deck.year] = (counts[deck.year] ?? 0) + 1;
    return counts;
  }, {});
}

function getDeckVariants(deck: Deck) {
  const manualVariantsForDeck = manualDeckVariants.filter(
    (variant) => variant.deckId === deck.id
  );

  const automaticSwitchVariant = generateSwitchDeckVariant(deck);

  const variants: DeckVariant[] = [...manualVariantsForDeck];

  if (automaticSwitchVariant) {
    variants.push(automaticSwitchVariant);
  }

  return variants;
}


function getCardCompletionKey(section: CardSection, card: EnrichedDeckCard) {
  return `${section}:${card.name}`;
}

function getCompletionScopeKey(deck: Deck, variant: DeckVariant | null) {
  return `${deck.id}::${variant?.id ?? "base"}`;
}

function getDoneCopyCount(cards: EnrichedDeckCard[], section: CardSection, doneCardKeys: Set<string>) {
  return cards.reduce((total, card) => {
    if (doneCardKeys.has(getCardCompletionKey(section, card))) {
      return total + card.quantity;
    }

    return total;
  }, 0);
}

function CompletionOverview({
  doneCopies,
  totalCopies,
  onMarkAllDone,
  onResetDone,
}: {
  doneCopies: number;
  totalCopies: number;
  onMarkAllDone: () => void;
  onResetDone: () => void;
}) {
  const remainingCopies = totalCopies - doneCopies;
  const progressPercent =
    totalCopies > 0 ? Math.round((doneCopies / totalCopies) * 100) : 0;

  return (
    <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
            Card completion
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            {remainingCopies} card copies still needed
          </h3>
          <p className="mt-1 text-sm text-emerald-100/70">
            Mark cards as done once you own or have crafted the needed copies.
            Progress is saved in this browser for the selected deck variant.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onMarkAllDone}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Mark deck done
          </button>
          <button
            onClick={onResetDone}
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            Reset deck
          </button>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
        <span>{doneCopies} done copies</span>
        <span>•</span>
        <span>{totalCopies} total copies</span>
        <span>•</span>
        <span>{progressPercent}% complete</span>
      </div>
    </div>
  );
}

function DeckSourceBox({ deck }: { deck: Deck }) {
  if (!deck.source) {
    return null;
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-blue-400">
        Deck source
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-900 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Event / source
          </p>
          <p className="mt-1 font-semibold text-slate-200">
            {deck.source.label}
          </p>
        </div>

        {deck.source.player ? (
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Player
            </p>
            <p className="mt-1 font-semibold text-slate-200">
              {deck.source.player}
            </p>
          </div>
        ) : null}

        {deck.source.deckType ? (
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Deck type
            </p>
            <p className="mt-1 font-semibold text-slate-200">
              {deck.source.deckType}
            </p>
          </div>
        ) : null}

        {deck.source.url ? (
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              URL
            </p>
            <a
              href={deck.source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-words text-sm font-semibold text-blue-300 hover:text-blue-200"
            >
              Open source page
            </a>
          </div>
        ) : null}
      </div>

      {deck.source.notes ? (
        <p className="mt-3 text-sm text-slate-400">{deck.source.notes}</p>
      ) : null}
    </div>
  );
}

export function DeckViewer({ decks }: DeckViewerProps) {
  const [showSampleDecks, setShowSampleDecks] = useState(false);
  const [selectedYear, setSelectedYear] = useState<YearFilter>("all");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const yearCounts = useMemo(
    () => getYearCounts(decks, showSampleDecks),
    [decks, showSampleDecks]
  );

  const availableYears = useMemo(
    () =>
      Array.from(new Set(decks.map((deck) => deck.year))).sort(
        (yearA, yearB) => yearA - yearB
      ),
    [decks]
  );

  const visibleDecks = useMemo(
    () => getVisibleDecks(decks, showSampleDecks, selectedYear),
    [decks, showSampleDecks, selectedYear]
  );

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
  const [selectedCompletionFilter, setSelectedCompletionFilter] =
    useState<CompletionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [doneCardKeysByScope, setDoneCardKeysByScope] = useState<
    Record<string, string[]>
  >({});
  const [isCompletionLoaded, setIsCompletionLoaded] = useState(false);

  const selectedDeck =
    visibleDecks.find((deck) => deck.id === selectedDeckId) ?? fallbackDeck;

  const availableVariants = useMemo(
    () => getDeckVariants(selectedDeck),
    [selectedDeck]
  );

  const selectedVariant =
    availableVariants.find((variant) => variant.id === selectedVariantId) ??
    null;

  const activeCompletionScopeKey = getCompletionScopeKey(
    selectedDeck,
    selectedVariant
  );
  const doneCardKeys = new Set(
    doneCardKeysByScope[activeCompletionScopeKey] ?? []
  );

  const activeDeckCards = applyDeckVariant(selectedDeck, selectedVariant);

  const enrichedMainDeck = activeDeckCards.mainDeck.map(enrichDeckCard);
  const enrichedExtraDeck = activeDeckCards.extraDeck.map(enrichDeckCard);
  const enrichedSideDeck = activeDeckCards.sideDeck.map(enrichDeckCard);

  const allCards = [
    ...enrichedMainDeck,
    ...enrichedExtraDeck,
    ...enrichedSideDeck,
  ];

  const tags = allCards.flatMap((card) => card.tags ?? []);
  const availableTags = Array.from(new Set(tags)).sort();

  const packs = allCards.flatMap(getCardPackNames);
  const availablePacks = Array.from(new Set(packs)).sort();

  useEffect(() => {
    queueMicrotask(() => {
      setDoneCardKeysByScope(getStoredDoneCardKeysByScope());
      setIsCompletionLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isCompletionLoaded) {
      return;
    }

    window.localStorage.setItem(
      CARD_COMPLETION_STORAGE_KEY,
      JSON.stringify(doneCardKeysByScope)
    );
  }, [doneCardKeysByScope, isCompletionLoaded]);

  const totalCardCopies = allCards.reduce(
    (total, card) => total + card.quantity,
    0
  );
  const doneCardCopies =
    getDoneCopyCount(enrichedMainDeck, "Main Deck", doneCardKeys) +
    getDoneCopyCount(enrichedExtraDeck, "Extra Deck", doneCardKeys) +
    getDoneCopyCount(enrichedSideDeck, "Side Deck", doneCardKeys);

  function filterCards(cards: EnrichedDeckCard[], section: CardSection) {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesTag = selectedTag ? card.tags?.includes(selectedTag) : true;
      const matchesSearch = normalizedSearchQuery
        ? card.name.toLowerCase().includes(normalizedSearchQuery)
        : true;
      const matchesSource = matchesSourceStatus(card, selectedSourceStatus);
      const matchesSelectedPack = matchesPack(card, selectedPack);
      const isCardDone = doneCardKeys.has(getCardCompletionKey(section, card));
      const matchesCompletion =
        selectedCompletionFilter === "all" ||
        (selectedCompletionFilter === "done" && isCardDone) ||
        (selectedCompletionFilter === "remaining" && !isCardDone);

      return (
        matchesTag &&
        matchesSearch &&
        matchesSource &&
        matchesSelectedPack &&
        matchesCompletion
      );
    });
  }

  const filteredMainDeck = filterCards(enrichedMainDeck, "Main Deck");
  const filteredExtraDeck = filterCards(enrichedExtraDeck, "Extra Deck");
  const filteredSideDeck = filterCards(enrichedSideDeck, "Side Deck");

  function resetFiltersAndSelection() {
    setSelectedCard(null);
    setSelectedTag(null);
    setSelectedSourceStatus(null);
    setSelectedPack(null);
    setSelectedCompletionFilter("all");
    setSearchQuery("");
  }

  function selectFirstVisibleDeck(nextVisibleDecks: Deck[]) {
    if (!nextVisibleDecks[0]) {
      return;
    }

    setSelectedDeckId(nextVisibleDecks[0].id);
    setSelectedVariantId(null);
    resetFiltersAndSelection();
  }

  function handleSelectDeck(deckId: string) {
    setSelectedDeckId(deckId);
    setSelectedVariantId(null);
    resetFiltersAndSelection();
  }

  function handleToggleShowSampleDecks() {
    const nextShowSampleDecks = !showSampleDecks;
    const nextVisibleDecks = getVisibleDecks(
      decks,
      nextShowSampleDecks,
      selectedYear
    );
    const selectedDeckStillVisible = nextVisibleDecks.some(
      (deck) => deck.id === selectedDeckId
    );

    setShowSampleDecks(nextShowSampleDecks);

    if (!selectedDeckStillVisible) {
      selectFirstVisibleDeck(nextVisibleDecks);
    }
  }

  function handleSelectYear(year: YearFilter) {
    const nextVisibleDecks = getVisibleDecks(decks, showSampleDecks, year);
    const selectedDeckStillVisible = nextVisibleDecks.some(
      (deck) => deck.id === selectedDeckId
    );

    setSelectedYear(year);

    if (!selectedDeckStillVisible) {
      selectFirstVisibleDeck(nextVisibleDecks);
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

  function handleSelectCompletionFilter(filter: CompletionFilter) {
    setSelectedCompletionFilter(filter);
    setSelectedCard(null);
  }

  function updateDoneCards(nextDoneCardKeys: Set<string>) {
    setDoneCardKeysByScope((currentDoneCardKeysByScope) => ({
      ...currentDoneCardKeysByScope,
      [activeCompletionScopeKey]: Array.from(nextDoneCardKeys).sort(),
    }));
  }

  function handleToggleCardDone(section: CardSection, card: EnrichedDeckCard) {
    const nextDoneCardKeys = new Set(doneCardKeys);
    const cardCompletionKey = getCardCompletionKey(section, card);

    if (nextDoneCardKeys.has(cardCompletionKey)) {
      nextDoneCardKeys.delete(cardCompletionKey);
    } else {
      nextDoneCardKeys.add(cardCompletionKey);
    }

    updateDoneCards(nextDoneCardKeys);
  }

  function handleMarkAllCardsDone() {
    updateDoneCards(
      new Set([
        ...enrichedMainDeck.map((card) =>
          getCardCompletionKey("Main Deck", card)
        ),
        ...enrichedExtraDeck.map((card) =>
          getCardCompletionKey("Extra Deck", card)
        ),
        ...enrichedSideDeck.map((card) =>
          getCardCompletionKey("Side Deck", card)
        ),
      ])
    );
  }

  function handleResetDoneCards() {
    updateDoneCards(new Set());
  }

  function handlePreviewCard(card: EnrichedDeckCard) {
    setSelectedCard(card);
  }

  const sidebarProps = {
    decks: visibleDecks,
    selectedDeck,
    showSampleDecks,
    sampleDeckCount,
    selectedYear,
    availableYears,
    yearCounts,
    onSelectYear: handleSelectYear,
    onToggleShowSampleDecks: handleToggleShowSampleDecks,
    onSelectDeck: handleSelectDeck,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:flex">
      <div className="hidden lg:block">
        <DeckSidebar {...sidebarProps} />
      </div>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close deck menu"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/70"
          />
          <div className="absolute left-0 top-0 h-full max-w-[85vw] shadow-2xl">
            <DeckSidebar
              {...sidebarProps}
              onRequestClose={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <main className="min-h-screen flex-1 bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Decks
          </button>

          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-semibold text-white">
              {selectedDeck.name}
            </p>
            <p className="text-xs text-slate-500">
              {selectedDeck.year} · {selectedDeck.format}
            </p>
          </div>
        </div>

        <CardSearch
          decks={visibleDecks}
          onPreviewCard={handlePreviewCard}
          onSelectDeck={handleSelectDeck}
        />

        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6 lg:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
            Selected deck
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
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
            inspect in-game source coverage, and mark cards as done as you complete them.
          </p>

          <DeckSourceBox deck={selectedDeck} />

          <CompletionOverview
            doneCopies={doneCardCopies}
            totalCopies={totalCardCopies}
            onMarkAllDone={handleMarkAllCardsDone}
            onResetDone={handleResetDoneCards}
          />

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
            doneCardKeys={doneCardKeys}
            onSelectPack={handleSelectPack}
          />

          <MissingSourceChecklist
            mainDeck={enrichedMainDeck}
            extraDeck={enrichedExtraDeck}
            sideDeck={enrichedSideDeck}
            doneCardKeys={doneCardKeys}
            onSelectCard={setSelectedCard}
          />
        </div>

        <DeckFilters
          availableTags={availableTags}
          availablePacks={availablePacks}
          selectedTag={selectedTag}
          selectedSourceStatus={selectedSourceStatus}
          selectedPack={selectedPack}
          selectedCompletionFilter={selectedCompletionFilter}
          searchQuery={searchQuery}
          onSelectTag={handleSelectTag}
          onSelectSourceStatus={handleSelectSourceStatus}
          onSelectPack={handleSelectPack}
          onSelectCompletionFilter={handleSelectCompletionFilter}
          onSearchChange={handleSearchChange}
        />

        <div className="space-y-6">
          <CardGrid
            title="Main Deck"
            cards={filteredMainDeck}
            selectedCard={selectedCard}
            doneCardKeys={doneCardKeys}
            onSelectCard={setSelectedCard}
            onToggleCardDone={handleToggleCardDone}
          />

          <CardGrid
            title="Extra Deck"
            cards={filteredExtraDeck}
            selectedCard={selectedCard}
            doneCardKeys={doneCardKeys}
            onSelectCard={setSelectedCard}
            onToggleCardDone={handleToggleCardDone}
          />

          <CardGrid
            title="Side Deck"
            cards={filteredSideDeck}
            selectedCard={selectedCard}
            doneCardKeys={doneCardKeys}
            onSelectCard={setSelectedCard}
            onToggleCardDone={handleToggleCardDone}
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