import { useMemo, useState } from "react";
import { cardDetails } from "../data/cardDetails";
import { generatedCardGameSources } from "../data/cardGameSources.generated";
import { cardGameSources } from "../data/cardGameSources";
import { enrichCardByName, enrichDeckCard } from "../lib/enrichDeckCard";
import {
  getCardAvailabilityBadgeClassName,
  getCardAvailabilityLabel,
  getCardAvailabilityReason,
  isCardAvailableInGame,
} from "../lib/cardAvailability";
import type { Deck, DeckCard, EnrichedDeckCard } from "../types/deck";

type CardSearchProps = {
  decks: Deck[];
  onPreviewCard: (card: EnrichedDeckCard) => void;
  onSelectDeck: (deckId: string) => void;
};

type CardSearchOccurrence = {
  deck: Deck;
  section: "Main Deck" | "Extra Deck" | "Side Deck";
  quantity: number;
};

type CardIndexEntry = {
  name: string;
  knownFrom: string[];
  occurrences: CardSearchOccurrence[];
  totalQuantity: number;
};

type CardSearchResult = {
  card: EnrichedDeckCard;
  knownFrom: string[];
  occurrences: CardSearchOccurrence[];
  totalQuantity: number;
};

const MAX_RESULTS = 25;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCardKey(cardName: string) {
  return normalizeText(cardName);
}

function addKnownCard(
  knownCards: Map<string, { name: string; knownFrom: Set<string> }>,
  cardName: string,
  knownFrom: string
) {
  const trimmedCardName = cardName.trim();

  if (!trimmedCardName) {
    return;
  }

  const key = getCardKey(trimmedCardName);
  const existing = knownCards.get(key);

  if (existing) {
    existing.knownFrom.add(knownFrom);
    return;
  }

  knownCards.set(key, {
    name: trimmedCardName,
    knownFrom: new Set([knownFrom]),
  });
}

function collectDeckOccurrences(decks: Deck[]) {
  const occurrencesByCardName = new Map<string, CardSearchOccurrence[]>();

  decks.forEach((deck) => {
    const sections = [
      { name: "Main Deck" as const, cards: deck.mainDeck },
      { name: "Extra Deck" as const, cards: deck.extraDeck },
      { name: "Side Deck" as const, cards: deck.sideDeck },
    ];

    sections.forEach((section) => {
      section.cards.forEach((card) => {
        const key = getCardKey(card.name);
        const existingOccurrences = occurrencesByCardName.get(key) ?? [];

        existingOccurrences.push({
          deck,
          section: section.name,
          quantity: card.quantity,
        });

        occurrencesByCardName.set(key, existingOccurrences);
      });
    });
  });

  return occurrencesByCardName;
}

function collectKnownCards(decks: Deck[]) {
  const knownCards = new Map<string, { name: string; knownFrom: Set<string> }>();

  decks.forEach((deck) => {
    [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck].forEach((card) => {
      addKnownCard(knownCards, card.name, "Visible decks");
    });
  });

  cardDetails.forEach((card) => {
    addKnownCard(knownCards, card.name, "Card details database");
  });

  Object.keys(cardGameSources).forEach((cardName) => {
    addKnownCard(knownCards, cardName, "Manual pack source mapping");
  });

  Object.keys(generatedCardGameSources).forEach((cardName) => {
    addKnownCard(knownCards, cardName, "Generated pack source mapping");
  });

  return knownCards;
}

function collectCardIndex(decks: Deck[]) {
  const knownCards = collectKnownCards(decks);
  const occurrencesByCardName = collectDeckOccurrences(decks);

  return Array.from(knownCards.values())
    .map((knownCard): CardIndexEntry => {
      const key = getCardKey(knownCard.name);
      const occurrences = occurrencesByCardName.get(key) ?? [];
      const totalQuantity = occurrences.reduce(
        (total, occurrence) => total + occurrence.quantity,
        0
      );

      return {
        name: knownCard.name,
        knownFrom: Array.from(knownCard.knownFrom).sort(),
        occurrences,
        totalQuantity,
      };
    })
    .sort((entryA, entryB) => entryA.name.localeCompare(entryB.name));
}

function getDeckCardForPreview(entry: CardIndexEntry): DeckCard {
  return {
    name: entry.name,
    quantity: entry.occurrences[0]?.quantity ?? 1,
  };
}

function getFirstSourceLabel(card: EnrichedDeckCard) {
  if (!isCardAvailableInGame(card)) {
    return null;
  }

  return card.gameSourceInfo?.sources?.[0]?.packName ?? null;
}

function isSameCardName(cardNameA: string, cardNameB: string) {
  return getCardKey(cardNameA) === getCardKey(cardNameB);
}

function toSearchResult(entry: CardIndexEntry): CardSearchResult {
  return {
    card: enrichDeckCard(getDeckCardForPreview(entry)),
    knownFrom: entry.knownFrom,
    occurrences: entry.occurrences,
    totalQuantity: entry.totalQuantity,
  };
}

function getFallbackResult(searchQuery: string): CardSearchResult | null {
  const trimmedQuery = searchQuery.trim();

  if (!trimmedQuery) {
    return null;
  }

  return {
    card: enrichCardByName(trimmedQuery),
    knownFrom: ["Exact search fallback"],
    occurrences: [],
    totalQuantity: 0,
  };
}

export function CardSearch({
  decks,
  onPreviewCard,
  onSelectDeck,
}: CardSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const cardIndex = useMemo(() => collectCardIndex(decks), [decks]);

  const filteredResults = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);

    if (!normalizedQuery) {
      return [];
    }

    const matchingEntries = cardIndex
      .filter((entry) => normalizeText(entry.name).includes(normalizedQuery))
      .sort((entryA, entryB) => {
        const exactRankA = isSameCardName(entryA.name, searchQuery) ? 0 : 1;
        const exactRankB = isSameCardName(entryB.name, searchQuery) ? 0 : 1;
        const deckRankA = entryA.occurrences.length > 0 ? 0 : 1;
        const deckRankB = entryB.occurrences.length > 0 ? 0 : 1;

        return (
          exactRankA - exactRankB ||
          deckRankA - deckRankB ||
          entryA.name.localeCompare(entryB.name)
        );
      })
      .slice(0, MAX_RESULTS);

    const localResults = matchingEntries.map(toSearchResult);
    const hasExactLocalResult = localResults.some((result) =>
      isSameCardName(result.card.name, searchQuery)
    );

    const fallbackResult = getFallbackResult(searchQuery);

    if (!fallbackResult || hasExactLocalResult) {
      return localResults;
    }

    return [fallbackResult, ...localResults].slice(0, MAX_RESULTS);
  }, [cardIndex, searchQuery]);

  return (
    <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
            Card search
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Search cards and pack sources
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Search any card name to preview details, pack source mapping, and
            deck usage when available.
          </p>
        </div>

        <div className="w-full lg:w-96">
          <label
            htmlFor="global-card-search"
            className="text-xs uppercase tracking-[0.25em] text-slate-500"
          >
            Card name
          </label>
          <input
            id="global-card-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Example: Raigeki, Destiny Board, Book of Moon"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-400">
        <span className="rounded-full bg-slate-950 px-3 py-1">
          {cardIndex.length} known cards
        </span>
        <span className="rounded-full bg-slate-950 px-3 py-1">
          {decks.length} visible deck{decks.length === 1 ? "" : "s"}
        </span>
        {searchQuery.trim() ? (
          <span className="rounded-full bg-slate-950 px-3 py-1">
            Showing {filteredResults.length} result
            {filteredResults.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {!searchQuery.trim() ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
          Type a card name to search the local card database, pack mappings, and
          currently visible decks.
        </div>
      ) : null}

      {searchQuery.trim() && filteredResults.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
          No matching local cards found. Try the exact card name and use Preview
          card to fetch basic card details.
        </div>
      ) : null}

      {filteredResults.length > 0 ? (
        <div className="mt-5 space-y-3">
          {filteredResults.map((result) => {
            const firstSourceLabel = getFirstSourceLabel(result.card);
            const isFallbackOnly = result.knownFrom.includes(
              "Exact search fallback"
            );

            return (
              <div
                key={`${result.card.name}-${result.knownFrom.join("-")}`}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <button
                      onClick={() => onPreviewCard(result.card)}
                      className="text-left text-lg font-bold text-white transition hover:text-blue-300"
                    >
                      {result.card.name}
                    </button>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${getCardAvailabilityBadgeClassName(
                          result.card
                        )}`}
                      >
                        {getCardAvailabilityLabel(result.card)}
                      </span>

                      {!isCardAvailableInGame(result.card) ? (
                        <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                          {getCardAvailabilityReason(result.card)}
                        </span>
                      ) : null}

                      {firstSourceLabel ? (
                        <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                          {firstSourceLabel}
                        </span>
                      ) : null}

                      {result.occurrences.length > 0 ? (
                        <>
                          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                            Total deck copies: {result.totalQuantity}
                          </span>

                          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                            Used in {result.occurrences.length} deck
                            {result.occurrences.length === 1 ? "" : "s"}
                          </span>
                        </>
                      ) : (
                        <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                          Not used in visible decks
                        </span>
                      )}

                      {isFallbackOnly ? (
                        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
                          Exact search
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {result.knownFrom.map((source) => (
                        <span
                          key={source}
                          className="rounded-full bg-slate-900 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onPreviewCard(result.card)}
                    className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
                  >
                    Preview card
                  </button>
                </div>

                {result.occurrences.length > 0 ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {result.occurrences.slice(0, 6).map((occurrence) => (
                      <button
                        key={`${result.card.name}-${occurrence.deck.id}-${occurrence.section}`}
                        onClick={() => onSelectDeck(occurrence.deck.id)}
                        className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-blue-400 hover:bg-slate-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-200">
                              {occurrence.deck.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {occurrence.deck.year} · {occurrence.deck.format}
                            </p>
                          </div>

                          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-300">
                            x{occurrence.quantity}
                          </span>
                        </div>

                        <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                          {occurrence.section}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : null}

                {result.occurrences.length > 6 ? (
                  <p className="mt-3 text-xs text-slate-500">
                    +{result.occurrences.length - 6} more occurrence
                    {result.occurrences.length - 6 === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}