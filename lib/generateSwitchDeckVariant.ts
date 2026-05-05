import { enrichCardByName, enrichDeckCard } from "./enrichDeckCard";
import {
  getCardAvailabilityReason,
  isCardAvailableInGame,
  isCardUnavailableForPlay,
} from "./cardAvailability";
import type {
  Deck,
  DeckCard,
  DeckVariant,
  EnrichedDeckCard,
} from "../types/deck";

type DeckSectionName = "Main Deck" | "Extra Deck" | "Side Deck";

type SectionCard = {
  section: DeckSectionName;
  card: EnrichedDeckCard;
};

function normalizeCardName(name: string) {
  return name
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeTags(...tagGroups: Array<string[] | undefined>) {
  return Array.from(new Set(tagGroups.flatMap((tags) => tags ?? []))).sort();
}

function getDeckCardsBySection(deck: Deck): SectionCard[] {
  return [
    ...deck.mainDeck.map((card) => ({
      section: "Main Deck" as const,
      card: enrichDeckCard(card),
    })),
    ...deck.extraDeck.map((card) => ({
      section: "Extra Deck" as const,
      card: enrichDeckCard(card),
    })),
    ...deck.sideDeck.map((card) => ({
      section: "Side Deck" as const,
      card: enrichDeckCard(card),
    })),
  ];
}

function getTagOverlapScore(cardA: EnrichedDeckCard, cardB: EnrichedDeckCard) {
  const tagsA = new Set(cardA.tags ?? []);
  const tagsB = new Set(cardB.tags ?? []);

  return Array.from(tagsA).filter((tag) => tagsB.has(tag)).length;
}

function getCuratedReplacement(card: EnrichedDeckCard) {
  const suggestions = card.replacementInfo?.suggestions ?? [];

  const availableSuggestion = suggestions
    .map((suggestion) => ({
      suggestion,
      card: enrichCardByName(suggestion.cardName),
    }))
    .find(({ card: replacementCard }) => isCardAvailableInGame(replacementCard));

  if (!availableSuggestion) {
    return null;
  }

  return {
    card: availableSuggestion.card,
    reason: availableSuggestion.suggestion.reason,
  };
}

function getFallbackReplacement({
  card,
  section,
  allSectionCards,
}: {
  card: EnrichedDeckCard;
  section: DeckSectionName;
  allSectionCards: SectionCard[];
}) {
  const availableCards = allSectionCards.filter(
    (candidate) =>
      isCardAvailableInGame(candidate.card) &&
      normalizeCardName(candidate.card.name) !== normalizeCardName(card.name)
  );

  const sameSectionCards = availableCards.filter(
    (candidate) => candidate.section === section
  );

  const candidatePool =
    sameSectionCards.length > 0 ? sameSectionCards : availableCards;

  const bestCandidate = candidatePool
    .map((candidate) => ({
      ...candidate,
      score: getTagOverlapScore(card, candidate.card),
    }))
    .sort((candidateA, candidateB) => {
      return (
        candidateB.score - candidateA.score ||
        candidateA.card.name.localeCompare(candidateB.card.name)
      );
    })[0];

  if (!bestCandidate) {
    return null;
  }

  return {
    card: bestCandidate.card,
    reason:
      bestCandidate.score > 0
        ? "Automatic replacement. This card is available in game and shares one or more role tags with the unavailable card."
        : `Automatic replacement. This card is available in game and comes from the ${bestCandidate.section.toLowerCase()}.`,
  };
}

function buildReplacementCard({
  originalCard,
  replacementCard,
}: {
  originalCard: EnrichedDeckCard;
  replacementCard: EnrichedDeckCard;
}): DeckCard {
  return {
    name: replacementCard.name,
    quantity: originalCard.quantity,
    tags: mergeTags(replacementCard.tags, ["replacement"]),
  };
}

export function generateSwitchDeckVariant(deck: Deck): DeckVariant | null {
  const allSectionCards = getDeckCardsBySection(deck);
  const unavailableCards = allSectionCards.filter(({ card }) =>
    isCardUnavailableForPlay(card)
  );

  if (unavailableCards.length === 0) {
    return null;
  }

  const replacements = unavailableCards
    .map(({ section, card }) => {
      const curatedReplacement = getCuratedReplacement(card);
      const fallbackReplacement =
        curatedReplacement ??
        getFallbackReplacement({
          card,
          section,
          allSectionCards,
        });

      if (!fallbackReplacement) {
        return null;
      }

      return {
        from: card.name,
        to: buildReplacementCard({
          originalCard: card,
          replacementCard: fallbackReplacement.card,
        }),
        reason: `${getCardAvailabilityReason(card)}. ${fallbackReplacement.reason}`,
      };
    })
    .filter((replacement): replacement is NonNullable<typeof replacement> =>
      Boolean(replacement)
    );

  if (replacements.length === 0) {
    return null;
  }

  return {
    id: `${deck.id}-auto-switch-compatible`,
    deckId: deck.id,
    name: "Auto Switch-compatible version",
    description:
      "Automatically replaces cards that are not available, unknown, or missing source data with available in-game cards.",
    replacements,
  };
}