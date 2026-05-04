import type { DeckVariant } from "../types/deck";

export const deckVariants: DeckVariant[] = [
  {
    id: "goat-control-switch-compatible",
    deckId: "goat-control",
    name: "Switch-compatible version",
    description:
      "A game-compatible version of Goat Control that replaces cards unavailable in Yu-Gi-Oh! Legacy of the Duelist.",
    replacements: [
      {
        from: "Black Luster Soldier - Envoy of the Beginning",
        to: {
          name: "Dark Magician of Chaos",
          quantity: 1,
          tags: ["boss monster", "spell recovery", "replacement"],
        },
        reason:
          "Black Luster Soldier - Envoy of the Beginning is not available in this game. Dark Magician of Chaos keeps the role of a powerful late-game boss monster and is confirmed in the Yugi Muto/Yami pack.",
      },
    ],
  },
];