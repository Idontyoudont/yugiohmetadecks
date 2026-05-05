import type { EnrichedDeckCard } from "../types/deck";

export function isCardAvailableInGame(card: EnrichedDeckCard) {
  return card.gameSourceInfo?.status === "available";
}

export function isCardUnavailableForPlay(card: EnrichedDeckCard) {
  return !isCardAvailableInGame(card);
}

export function getCardAvailabilityLabel(card: EnrichedDeckCard) {
  if (isCardAvailableInGame(card)) {
    return "Available";
  }

  return "Unavailable / needs replacement";
}

export function getCardAvailabilityReason(card: EnrichedDeckCard) {
  if (!card.gameSourceInfo) {
    return "Missing source data";
  }

  if (card.gameSourceInfo.status === "not-in-game") {
    return "Not in game";
  }

  if (card.gameSourceInfo.status === "unknown") {
    return "Unknown source";
  }

  return "Unavailable";
}

export function getCardAvailabilityBadgeClassName(card: EnrichedDeckCard) {
  if (isCardAvailableInGame(card)) {
    return "bg-emerald-500/20 text-emerald-300";
  }

  return "bg-amber-500/20 text-amber-300";
}