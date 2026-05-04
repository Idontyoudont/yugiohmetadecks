const decks = [
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
    sideDeck: ["Maxx \"C\"", "Electric Virus", "Mystical Space Typhoon"],
  },
];

const selectedDeck = decks[0];

function CardGrid({ title, cards }: { title: string; cards: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
          {cards.length} cards
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {cards.map((card) => (
          <button
            key={card}
            className="min-h-32 rounded-xl border border-slate-700 bg-slate-800 p-3 text-left text-sm text-slate-100 transition hover:-translate-y-1 hover:border-blue-400 hover:bg-slate-700"
          >
            <div className="mb-3 aspect-[3/4] rounded-lg bg-gradient-to-br from-slate-700 to-slate-950" />
            <p className="font-medium leading-snug">{card}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-800 bg-slate-950 p-6">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
              Yu-Gi-Oh
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">Meta Decks</h1>
          </div>

          <nav className="space-y-2">
            {decks.map((deck) => (
              <button
                key={deck.id}
                className={`w-full rounded-xl px-4 py-3 text-left transition ${
                  deck.id === selectedDeck.id
                    ? "bg-blue-500 text-white"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="font-semibold">{deck.name}</div>
                <div className="text-sm opacity-80">
                  {deck.year} · {deck.format}
                </div>
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex-1 overflow-y-auto p-8">
          <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
              Selected deck
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white">
              {selectedDeck.name}
            </h2>
            <p className="mt-3 text-slate-300">
              {selectedDeck.year} · {selectedDeck.format}
            </p>
            <p className="mt-5 max-w-3xl text-slate-400">
              This is the first layout test for the Yu-Gi-Oh meta deck viewer.
              For now, the cards are placeholders. Later, each card can show its
              real image, effect text, attributes, sets, and custom role tags.
            </p>
          </div>

          <div className="space-y-6">
            <CardGrid title="Main Deck" cards={selectedDeck.mainDeck} />
            <CardGrid title="Extra Deck" cards={selectedDeck.extraDeck} />
            <CardGrid title="Side Deck" cards={selectedDeck.sideDeck} />
          </div>
        </section>
      </div>
    </main>
  );
}