import type { Deck } from "../types/deck";

export const decks: Deck[] = [
  {
    id: "goat-control",
    name: "Goat Control",
    year: 2005,
    format: "Goat Format",
    mainDeck: [
      {
  name: "Black Luster Soldier - Envoy of the Beginning",
  quantity: 1,
  tags: ["boss monster", "banish", "light/dark payoff"],
  imageUrl:
    "https://images.ygoprodeck.com/images/cards/72989439.jpg",
  cardType: "Effect Monster",
  attribute: "LIGHT",
  level: 8,
  description:
    "Cannot be Normal Summoned/Set. Must first be Special Summoned by banishing 1 LIGHT and 1 DARK monster from your GY. Once per turn, you can activate one of its powerful removal or attack effects.",
},
      {
        name: "Magician of Faith",
        quantity: 2,
        tags: ["flip", "recovery"],
      },
      {
        name: "Sinister Serpent",
        quantity: 1,
        tags: ["resource"],
      },
      {
        name: "Scapegoat",
        quantity: 3,
        tags: ["defense", "engine"],
      },
      {
        name: "Metamorphosis",
        quantity: 3,
        tags: ["engine"],
      },
      {
        name: "Book of Moon",
        quantity: 2,
        tags: ["disruption", "quick-play"],
      },
      {
        name: "Graceful Charity",
        quantity: 1,
        tags: ["draw"],
      },
      {
        name: "Mirror Force",
        quantity: 1,
        tags: ["removal", "trap"],
      },
    ],
    extraDeck: [
      {
        name: "Thousand-Eyes Restrict",
        quantity: 3,
        tags: ["fusion", "control"],
      },
      {
        name: "Dark Balter the Terrible",
        quantity: 1,
        tags: ["fusion"],
      },
      {
        name: "Ryu Senshi",
        quantity: 1,
        tags: ["fusion"],
      },
    ],
    sideDeck: [
      {
        name: "Dust Tornado",
        quantity: 2,
        tags: ["spell trap removal"],
      },
      {
        name: "Nobleman of Crossout",
        quantity: 2,
        tags: ["removal"],
      },
      {
        name: "Mobius the Frost Monarch",
        quantity: 2,
        tags: ["tribute", "spell trap removal"],
      },
    ],
  },
  {
    id: "dragon-ruler",
    name: "Dragon Ruler",
    year: 2013,
    format: "TCG Advanced",
    mainDeck: [
      {
        name: "Blaster, Dragon Ruler of Infernos",
        quantity: 3,
        tags: ["engine", "removal"],
      },
      {
        name: "Tidal, Dragon Ruler of Waterfalls",
        quantity: 3,
        tags: ["engine"],
      },
      {
        name: "Tempest, Dragon Ruler of Storms",
        quantity: 3,
        tags: ["engine", "search"],
      },
      {
        name: "Redox, Dragon Ruler of Boulders",
        quantity: 3,
        tags: ["engine", "revival"],
      },
      {
        name: "Super Rejuvenation",
        quantity: 3,
        tags: ["draw"],
      },
      {
        name: "Sacred Sword of Seven Stars",
        quantity: 3,
        tags: ["draw", "banish"],
      },
      {
        name: "Gold Sarcophagus",
        quantity: 1,
        tags: ["search", "banish"],
      },
      {
        name: "Return from the Different Dimension",
        quantity: 1,
        tags: ["power card", "trap"],
      },
    ],
    extraDeck: [
      {
        name: "Mecha Phantom Beast Dracossack",
        quantity: 2,
        tags: ["rank 7", "control"],
      },
      {
        name: "Number 11: Big Eye",
        quantity: 2,
        tags: ["rank 7", "control"],
      },
      {
        name: "Crimson Blader",
        quantity: 1,
        tags: ["synchro"],
      },
    ],
    sideDeck: [
      {
        name: 'Maxx "C"',
        quantity: 2,
        tags: ["hand trap"],
      },
      {
        name: "Electric Virus",
        quantity: 2,
        tags: ["side deck", "dragon counter"],
      },
      {
        name: "Mystical Space Typhoon",
        quantity: 3,
        tags: ["spell trap removal"],
      },
    ],
  },
];