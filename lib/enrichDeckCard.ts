import { cardDetails } from "../data/cardDetails";
import { cardGameSources } from "../data/cardGameSources";
import { cardReplacements } from "../data/cardReplacements";
import type { DeckCard, EnrichedDeckCard } from "../types/deck";

function normalizeCardName(name: string) {
  return name
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function enrichDeckCard(card: DeckCard): EnrichedDeckCard {
  const normalizedCardName = normalizeCardName(card.name);

  const details = cardDetails.find(
    (detail) => normalizeCardName(detail.name) === normalizedCardName
  );

  const gameSourceEntry = Object.entries(cardGameSources).find(
    ([cardName]) => normalizeCardName(cardName) === normalizedCardName
  );

  const replacementEntry = Object.entries(cardReplacements).find(
    ([cardName]) => normalizeCardName(cardName) === normalizedCardName
  );

  return {
    ...details,
    ...card,
    name: card.name,
    gameSourceInfo: gameSourceEntry?.[1],
    replacementInfo: replacementEntry?.[1],
  };
}