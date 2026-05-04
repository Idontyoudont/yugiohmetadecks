import type { Deck } from "../types/deck";

export const decks: Deck[] = [
  {
    id: "goat-control",
    name: "Goat Control",
    year: 2005,
    format: "Goat Format",
    mainDeck: [
      "Black Luster Soldier - Envoy of the Beginning",
      "Magician of Faith",
      "Sinister Serpent",
      "Scapegoat",
      "Metamorphosis",
      "Book of Moon",
      "Graceful Charity",
      "Mirror Force",
    ],
    extraDeck: [
      "Thousand-Eyes Restrict",
      "Dark Balter the Terrible",
      "Ryu Senshi",
    ],
    sideDeck: [
      "Dust Tornado",
      "Nobleman of Crossout",
      "Mobius the Frost Monarch",
    ],
  },
  {
    id: "dragon-ruler",
    name: "Dragon Ruler",
    year: 2013,
    format: "TCG Advanced",
    mainDeck: [
      "Blaster, Dragon Ruler of Infernos",
      "Tidal, Dragon Ruler of Waterfalls",
      "Tempest, Dragon Ruler of Storms",
      "Redox, Dragon Ruler of Boulders",
      "Super Rejuvenation",
      "Sacred Sword of Seven Stars",
      "Gold Sarcophagus",
      "Return from the Different Dimension",
    ],
    extraDeck: [
      "Mecha Phantom Beast Dracossack",
      "Number 11: Big Eye",
      "Crimson Blader",
    ],
    sideDeck: [
      'Maxx "C"',
      "Electric Virus",
      "Mystical Space Typhoon",
    ],
  },
];