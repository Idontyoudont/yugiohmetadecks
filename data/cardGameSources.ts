import type { CardGameSourceInfo } from "../types/deck";

const gameName = "Yu-Gi-Oh! Legacy of the Duelist";

function available(
  name: string,
  packName: string,
  cardCategory: string,
  notes?: string
): CardGameSourceInfo {
  return {
    name,
    status: "available",
    sources: [
      {
        game: gameName,
        packName,
        characterName: packName,
        cardCategory,
        notes:
          notes ??
          `Listed in the ${packName} pack according to the Steam community card pack breakdown.`,
      },
    ],
  };
}

function notInGame(name: string, notes?: string): CardGameSourceInfo {
  return {
    name,
    status: "not-in-game",
    notes:
      notes ??
      "Not found in the Yu-Gi-Oh! Legacy of the Duelist Steam community card pack breakdown during the current source pass.",
  };
}

export const cardGameSources: Record<string, CardGameSourceInfo> = {
  "Black Luster Soldier - Envoy of the Beginning": notInGame(
    "Black Luster Soldier - Envoy of the Beginning",
    "This exact Envoy version was not found in the Steam community card pack breakdown during the current source pass. Keep it in historical decklists, but mark it as unavailable for this game."
  ),

  "Airknight Parshath": available(
    "Airknight Parshath",
    "Bakura Ryou",
    "Effect Monsters"
  ),

  "Jinzo": available(
    "Jinzo",
    "Joey Wheeler",
    "Effect Monsters"
  ),

  "Breaker the Magical Warrior": available(
    "Breaker the Magical Warrior",
    "Yugi Muto/Yami",
    "Effect Monsters"
  ),

  "Tribe-Infecting Virus": available(
    "Tribe-Infecting Virus",
    "Seto Kaiba",
    "Effect Monsters"
  ),

  "Sinister Serpent": available(
    "Sinister Serpent",
    "Mai Valentine",
    "Effect Monsters"
  ),

  "Sangan": available(
    "Sangan",
    "Bakura Ryou",
    "Effect Monsters"
  ),

  "Magician of Faith": available(
    "Magician of Faith",
    "Yugi Muto/Yami",
    "Effect Monsters"
  ),

  "Morphing Jar": available(
    "Morphing Jar",
    "Bakura Ryou",
    "Effect Monsters"
  ),

  "Scapegoat": available(
    "Scapegoat",
    "Grandpa Muto",
    "Spell Cards"
  ),

  "Metamorphosis": available(
    "Metamorphosis",
    "Alexis Rhodes",
    "Spell Cards"
  ),

  "Pot of Greed": available(
    "Pot of Greed",
    "Grandpa Muto",
    "Spell Cards"
  ),

  "Graceful Charity": available(
    "Graceful Charity",
    "Grandpa Muto",
    "Spell Cards"
  ),

  "Premature Burial": available(
    "Premature Burial",
    "Grandpa Muto",
    "Spell Cards"
  ),

  "Heavy Storm": available(
    "Heavy Storm",
    "Yugi Muto/Yami",
    "Spell Cards"
  ),

  "Mystical Space Typhoon": available(
    "Mystical Space Typhoon",
    "Yugi Muto/Yami",
    "Spell Cards"
  ),

  "Swords of Revealing Light": available(
    "Swords of Revealing Light",
    "Yugi Muto/Yami",
    "Spell Cards"
  ),

  "Raigeki": available(
    "Raigeki",
    "Grandpa Muto",
    "Spell Cards"
  ),

  "Dust Tornado": available(
    "Dust Tornado",
    "Grandpa Muto",
    "Trap Cards"
  ),

  "Mobius the Frost Monarch": available(
    "Mobius the Frost Monarch",
    "Bastion Misawa",
    "Effect Monsters"
  ),

  "Spirit Reaper": available(
    "Spirit Reaper",
    "Bastion Misawa",
    "Effect Monsters"
  ),
};