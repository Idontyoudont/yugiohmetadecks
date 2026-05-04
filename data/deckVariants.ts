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
          name: "Chaos Sorcerer",
          quantity: 1,
          tags: ["boss monster", "banish", "light/dark payoff", "replacement"],
        },
        reason:
          "Black Luster Soldier - Envoy of the Beginning is not available in this game. Chaos Sorcerer keeps the LIGHT/DARK Chaos theme and provides similar removal pressure.",
      },
    ],
  },
];