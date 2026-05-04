import type { Deck, DeckCard, DeckVariant } from "../types/deck";

function normalizeCardName(name: string) {
  return name
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function applyReplacementsToCards(
  cards: DeckCard[],
  variant: DeckVariant | null
) {
  if (!variant) {
    return cards;
  }

  return cards.map((card) => {
    const replacement = variant.replacements.find(
      (item) => normalizeCardName(item.from) === normalizeCardName(card.name)
    );

    if (!replacement) {
      return card;
    }

    return replacement.to;
  });
}

export function applyDeckVariant(deck: Deck, variant: DeckVariant | null) {
  return {
    mainDeck: applyReplacementsToCards(deck.mainDeck, variant),
    extraDeck: applyReplacementsToCards(deck.extraDeck, variant),
    sideDeck: applyReplacementsToCards(deck.sideDeck, variant),
  };
}