import { enrichCardByName } from "../lib/enrichDeckCard";
import type { EnrichedDeckCard } from "../types/deck";

type MissingSourceChecklistProps = {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
  onSelectCard: (card: EnrichedDeckCard) => void;
};

type UnavailableSourceItem = {
  section: "Main Deck" | "Extra Deck" | "Side Deck";
  card: EnrichedDeckCard;
};

type ReplacementSuggestion = {
  card: EnrichedDeckCard;
  reason: string;
};

function isAvailableInGame(card: EnrichedDeckCard) {
  return card.gameSourceInfo?.status === "available";
}

function isUnavailableForPlay(card: EnrichedDeckCard) {
  return !isAvailableInGame(card);
}

function getUnavailableReason(card: EnrichedDeckCard) {
  if (!card.gameSourceInfo) {
    return "Missing source data";
  }

  if (card.gameSourceInfo.status === "not-in-game") {
    return "Not in game";
  }

  return "Unknown source";
}

function getUnavailableSourceCards({
  mainDeck,
  extraDeck,
  sideDeck,
}: {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
}) {
  const items: UnavailableSourceItem[] = [];

  mainDeck.forEach((card) => {
    if (isUnavailableForPlay(card)) {
      items.push({ section: "Main Deck", card });
    }
  });

  extraDeck.forEach((card) => {
    if (isUnavailableForPlay(card)) {
      items.push({ section: "Extra Deck", card });
    }
  });

  sideDeck.forEach((card) => {
    if (isUnavailableForPlay(card)) {
      items.push({ section: "Side Deck", card });
    }
  });

  return items;
}

function getAvailableCardsBySection({
  mainDeck,
  extraDeck,
  sideDeck,
}: {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
}) {
  return {
    "Main Deck": mainDeck.filter(isAvailableInGame),
    "Extra Deck": extraDeck.filter(isAvailableInGame),
    "Side Deck": sideDeck.filter(isAvailableInGame),
  };
}

function getTagOverlapScore(cardA: EnrichedDeckCard, cardB: EnrichedDeckCard) {
  const tagsA = new Set(cardA.tags ?? []);
  const tagsB = new Set(cardB.tags ?? []);

  return Array.from(tagsA).filter((tag) => tagsB.has(tag)).length;
}

function getCuratedReplacementSuggestions(
  card: EnrichedDeckCard
): ReplacementSuggestion[] {
  if (!card.replacementInfo || card.replacementInfo.suggestions.length === 0) {
    return [];
  }

  return card.replacementInfo.suggestions.map((suggestion) => ({
    card: enrichCardByName(suggestion.cardName),
    reason: suggestion.reason,
  }));
}

function getFallbackReplacementSuggestions({
  card,
  section,
  availableCardsBySection,
}: {
  card: EnrichedDeckCard;
  section: UnavailableSourceItem["section"];
  availableCardsBySection: Record<UnavailableSourceItem["section"], EnrichedDeckCard[]>;
}): ReplacementSuggestion[] {
  const sameSectionCards = availableCardsBySection[section].filter(
    (candidate) => candidate.name !== card.name
  );

  const fallbackPool =
    sameSectionCards.length > 0
      ? sameSectionCards
      : [
          ...availableCardsBySection["Main Deck"],
          ...availableCardsBySection["Extra Deck"],
          ...availableCardsBySection["Side Deck"],
        ].filter((candidate) => candidate.name !== card.name);

  return fallbackPool
    .map((candidate) => ({
      card: candidate,
      score: getTagOverlapScore(card, candidate),
    }))
    .sort((candidateA, candidateB) => {
      return (
        candidateB.score - candidateA.score ||
        candidateA.card.name.localeCompare(candidateB.card.name)
      );
    })
    .slice(0, 3)
    .map((candidate) => ({
      card: candidate.card,
      reason:
        candidate.score > 0
          ? "Available in game and shares one or more role tags with the unavailable card."
          : `Available in game from the same ${section.toLowerCase()} section.`,
    }));
}

function getReplacementSuggestions({
  card,
  section,
  availableCardsBySection,
}: {
  card: EnrichedDeckCard;
  section: UnavailableSourceItem["section"];
  availableCardsBySection: Record<UnavailableSourceItem["section"], EnrichedDeckCard[]>;
}) {
  const curatedSuggestions = getCuratedReplacementSuggestions(card);

  if (curatedSuggestions.length > 0) {
    return curatedSuggestions;
  }

  return getFallbackReplacementSuggestions({
    card,
    section,
    availableCardsBySection,
  });
}

export function MissingSourceChecklist({
  mainDeck,
  extraDeck,
  sideDeck,
  onSelectCard,
}: MissingSourceChecklistProps) {
  const unavailableSourceCards = getUnavailableSourceCards({
    mainDeck,
    extraDeck,
    sideDeck,
  });

  const availableCardsBySection = getAvailableCardsBySection({
    mainDeck,
    extraDeck,
    sideDeck,
  });

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">
          Unavailable card checklist
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Cards marked not in game, unknown, or missing source data are grouped
          together here so you can choose playable replacements.
        </p>
      </div>

      {unavailableSourceCards.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="font-semibold text-emerald-300">
            No unavailable cards found
          </p>
          <p className="mt-2 text-sm text-emerald-100/70">
            Every card in this deck currently has an available in-game source.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {unavailableSourceCards.map(({ section, card }) => {
            const suggestions = getReplacementSuggestions({
              card,
              section,
              availableCardsBySection,
            });

            return (
              <div
                key={`${section}-${card.name}`}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <button
                  onClick={() => onSelectCard(card)}
                  className="flex w-full items-center justify-between gap-4 text-left transition hover:text-blue-300"
                >
                  <div>
                    <p className="font-medium text-white">{card.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{section}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white">
                      x{card.quantity}
                    </span>
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
                      {getUnavailableReason(card)}
                    </span>
                  </div>
                </button>

                {suggestions.length > 0 ? (
                  <div className="mt-4 rounded-xl bg-slate-950 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-400">
                      Suggested replacements
                    </p>

                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {suggestions.map((suggestion) => (
                        <button
                          key={`${card.name}-${suggestion.card.name}`}
                          onClick={() => onSelectCard(suggestion.card)}
                          className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-blue-400 hover:bg-slate-800"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-200">
                              {suggestion.card.name}
                            </p>
                            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                              Available
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {suggestion.reason}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No replacement suggestions available yet.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}