import type { Deck } from "../types/deck";

export const importedDecks: Deck[] = [
  {
    id: "tag-import-test",
    name: "Tag Import Test",
    year: 2005,
    format: "Goat Format",
    status: "draft",
    mainDeck: [
    {
      name: "Pot of Greed",
      quantity: 1,
      tags: ["draw"],
    },
    {
      name: "Book of Moon",
      quantity: 2,
      tags: ["disruption", "quick-play"],
    },
    {
      name: "Jinzo",
      quantity: 1,
      tags: ["tribute", "trap control"],
    }
  ],
    extraDeck: [],
    sideDeck: [],
  }
];
