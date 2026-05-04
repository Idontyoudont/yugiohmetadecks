import type { Deck } from "../types/deck";

export const importedDecks: Deck[] = [
  {
    id: "duplicate-test",
    name: "Duplicate Test",
    year: 2005,
    format: "Goat Format",
    status: "draft",
    mainDeck: [
    {
      name: "Pot of Greed",
      quantity: 1,
      tags: ["draw", "power spell"],
    }
  ],
    extraDeck: [],
    sideDeck: [],
  },
  {
    id: "duplicate-test-2",
    name: "Duplicate Test",
    year: 2005,
    format: "Goat Format",
    status: "draft",
    mainDeck: [
    {
      name: "Book of Moon",
      quantity: 1,
      tags: ["disruption", "flip support", "quick-play"],
    }
  ],
    extraDeck: [],
    sideDeck: [],
  }
];
