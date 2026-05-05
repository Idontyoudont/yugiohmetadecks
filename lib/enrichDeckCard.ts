import { cardDetails } from "../data/cardDetails";
import { generatedBanlist } from "../data/banlist.generated";
import { generatedCardGameSources } from "../data/cardGameSources.generated";
import { cardGameSources } from "../data/cardGameSources";
import { cardReplacements } from "../data/cardReplacements";
import type {
  BanlistInfo,
  CardGameSourceInfo,
  DeckCard,
  EnrichedDeckCard,
} from "../types/deck";

function normalizeCardName(name: string) {
  return name
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”"]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function findByNormalizedName<T>(
  records: Record<string, T>,
  cardName: string
): T | undefined {
  const normalizedCardName = normalizeCardName(cardName);

  const entry = Object.entries(records).find(
    ([recordCardName]) => normalizeCardName(recordCardName) === normalizedCardName
  );

  return entry?.[1];
}

function getCardDetails(cardName: string) {
  const normalizedCardName = normalizeCardName(cardName);

  return cardDetails.find(
    (detail) => normalizeCardName(detail.name) === normalizedCardName
  );
}

function getGameSourceInfo(cardName: string): CardGameSourceInfo | undefined {
  const generatedSource = findByNormalizedName(
    generatedCardGameSources,
    cardName
  );

  const manualSource = findByNormalizedName(cardGameSources, cardName);

  if (generatedSource?.status === "available") {
    return generatedSource;
  }

  return manualSource ?? generatedSource;
}

function getReplacementInfo(cardName: string) {
  return findByNormalizedName(cardReplacements, cardName);
}

function getBanlistInfo(cardName: string): BanlistInfo | undefined {
  return findByNormalizedName(generatedBanlist, cardName);
}

export function enrichDeckCard(card: DeckCard): EnrichedDeckCard {
  const details = getCardDetails(card.name);
  const gameSourceInfo = getGameSourceInfo(card.name);
  const replacementInfo = getReplacementInfo(card.name);
  const banlistInfo = getBanlistInfo(card.name);

  return {
    ...details,
    ...card,
    name: card.name,
    gameSourceInfo,
    replacementInfo,
    banlistInfo,
  };
}

export function enrichCardByName(cardName: string): EnrichedDeckCard {
  const details = getCardDetails(cardName);
  const gameSourceInfo = getGameSourceInfo(cardName);
  const replacementInfo = getReplacementInfo(cardName);
  const banlistInfo = getBanlistInfo(cardName);

  return {
    ...details,
    name: cardName,
    quantity: 1,
    tags: ["replacement"],
    gameSourceInfo,
    replacementInfo,
    banlistInfo,
  };
}