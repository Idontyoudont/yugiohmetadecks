import { cardDetails } from "../data/cardDetails";
import type { DeckCard, EnrichedDeckCard } from "../types/deck";

export function enrichDeckCard(card: DeckCard): EnrichedDeckCard {
  const details = cardDetails.find(
    (detail) => detail.name.toLowerCase() === card.name.toLowerCase()
  );

  return {
    ...details,
    ...card,
    name: card.name,
  };
}