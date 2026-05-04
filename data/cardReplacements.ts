import type { CardReplacementInfo } from "../types/deck";

export const cardReplacements: Record<string, CardReplacementInfo> = {
  "Black Luster Soldier - Envoy of the Beginning": {
    name: "Black Luster Soldier - Envoy of the Beginning",
    suggestions: [
      {
        cardName: "Chaos Sorcerer",
        reason:
          "Closest Chaos-style replacement. It also uses LIGHT and DARK Graveyard setup and provides monster removal.",
      },
      {
        cardName: "Dark Magician of Chaos",
        reason:
          "Powerful high-impact monster option if you want another late-game boss monster.",
      },
      {
        cardName: "Jinzo",
        reason:
          "Strong tribute monster that helps against trap-heavy decks and already fits the Goat Control shell.",
      },
      {
        cardName: "Airknight Parshath",
        reason:
          "Useful tribute monster that pressures defense-position monsters and generates card advantage.",
      },
    ],
  },
};