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

function getCardDetails(cardName: string) {
  const normalizedCardName = normalizeCardName(cardName);

  return cardDetails.find(
    (detail) => normalizeCardName(detail.name) === normalizedCardName
  );
}

function getGameSourceInfo(cardName: string) {
  const normalizedCardName = normalizeCardName(cardName);

  const gameSourceEntry = Object.entries(cardGameSources).find(
    ([sourceCardName]) => normalizeCardName(sourceCardName) === normalizedCardName
  );

  return gameSourceEntry?.[1];
}

function getReplacementInfo(cardName: string) {
  const normalizedCardName = normalizeCardName(cardName);

  const replacementEntry = Object.entries(cardReplacements).find(
    ([replacementCardName]) =>
      normalizeCardName(replacementCardName) === normalizedCardName
  );

  return replacementEntry?.[1];
}

export function enrichDeckCard(card: DeckCard): EnrichedDeckCard {
  const details = getCardDetails(card.name);
  const gameSourceInfo = getGameSourceInfo(card.name);
  const replacementInfo = getReplacementInfo(card.name);

  return {
    ...details,
    ...card,
    name: card.name,
    gameSourceInfo,
    replacementInfo,
  };
}

export function enrichCardByName(cardName: string): EnrichedDeckCard {
  const details = getCardDetails(cardName);
  const gameSourceInfo = getGameSourceInfo(cardName);
  const replacementInfo = getReplacementInfo(cardName);

  return {
    ...details,
    name: cardName,
    quantity: 1,
    tags: ["replacement"],
    gameSourceInfo,
    replacementInfo,
  };
}