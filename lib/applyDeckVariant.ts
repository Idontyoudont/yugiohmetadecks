import type { Deck, DeckCard, DeckVariant } from "../types/deck";

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

function mergeDuplicateCards(cards: DeckCard[]) {
  const cardsByName = new Map<string, DeckCard>();

  cards.forEach((card) => {
    const key = normalizeCardName(card.name);
    const existingCard = cardsByName.get(key);

    if (!existingCard) {
      cardsByName.set(key, {
        ...card,
        tags: card.tags ? [...card.tags] : undefined,
      });
      return;
    }

    existingCard.quantity += card.quantity;
    existingCard.tags = mergeTags(existingCard.tags, card.tags);
  });

  return Array.from(cardsByName.values());
}

function applyReplacementsToCards(
  cards: DeckCard[],
  variant: DeckVariant | null
) {
  if (!variant) {
    return cards;
  }

  const replacedCards = cards.map((card) => {
    const replacement = variant.replacements.find(
      (item) => normalizeCardName(item.from) === normalizeCardName(card.name)
    );

    if (!replacement) {
      return card;
    }

    return {
      ...replacement.to,
      quantity: card.quantity,
      tags: mergeTags(replacement.to.tags, ["replacement"]),
    };
  });

  return mergeDuplicateCards(replacedCards);
}

export function applyDeckVariant(deck: Deck, variant: DeckVariant | null) {
  return {
    mainDeck: applyReplacementsToCards(deck.mainDeck, variant),
    extraDeck: applyReplacementsToCards(deck.extraDeck, variant),
    sideDeck: applyReplacementsToCards(deck.sideDeck, variant),
  };
}