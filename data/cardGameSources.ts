import type { CardGameSourceInfo } from "../types/deck";

export const cardGameSources: Record<string, CardGameSourceInfo> = {
  "Black Luster Soldier - Envoy of the Beginning": {
    name: "Black Luster Soldier - Envoy of the Beginning",
    status: "not-in-game",
    notes:
      "Not listed in the Yu-Gi-Oh! Legacy of the Duelist card pack guide. This card can stay in historical decklists, but should be marked as unavailable for this game.",
  },

  Raigeki: {
    name: "Raigeki",
    status: "available",
    sources: [
      {
        game: "Yu-Gi-Oh! Legacy of the Duelist",
        packName: "Grandpa Muto",
        characterName: "Grandpa Muto",
        cardCategory: "Spell Cards",
        notes:
          "Listed in the Grandpa Muto pack according to the Steam community card pack breakdown.",
      },
    ],
  },
};