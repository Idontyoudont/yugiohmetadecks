import type { EnrichedDeckCard } from "../types/deck";

type DeckSourceCoverageProps = {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
};

function countCards(cards: EnrichedDeckCard[]) {
  return cards.reduce((total, card) => total + card.quantity, 0);
}

function isAvailableInGame(card: EnrichedDeckCard) {
  return card.gameSourceInfo?.status === "available";
}

function getSourceCounts(cards: EnrichedDeckCard[]) {
  return cards.reduce(
    (counts, card) => {
      if (isAvailableInGame(card)) {
        return {
          ...counts,
          available: counts.available + card.quantity,
        };
      }

      return {
        ...counts,
        unavailable: counts.unavailable + card.quantity,
      };
    },
    {
      available: 0,
      unavailable: 0,
    }
  );
}

export function DeckSourceCoverage({
  mainDeck,
  extraDeck,
  sideDeck,
}: DeckSourceCoverageProps) {
  const allCards = [...mainDeck, ...extraDeck, ...sideDeck];
  const totalCards = countCards(allCards);
  const counts = getSourceCounts(allCards);

  const coverageItems = [
    {
      label: "Available in game",
      value: counts.available,
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      description: "Known to have a mapped in-game pack source.",
    },
    {
      label: "Unavailable / needs replacement",
      value: counts.unavailable,
      className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
      description:
        "Either marked not in game, unknown, or missing source data. Treat these as cards that may need a playable replacement.",
    },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">
          In-game source coverage
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Cards without an available in-game source are grouped together as
          unavailable, because they may need replacement for gameplay.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {coverageItems.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border p-4 ${item.className}`}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="mt-2 text-3xl font-bold">{item.value}</p>
            <p className="mt-1 text-sm opacity-80">of {totalCards} cards</p>
            <p className="mt-3 text-sm opacity-80">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}