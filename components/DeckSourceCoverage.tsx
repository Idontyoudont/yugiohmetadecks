import type { EnrichedDeckCard } from "../types/deck";

type DeckSourceCoverageProps = {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
};

function countCards(cards: EnrichedDeckCard[]) {
  return cards.reduce((total, card) => total + card.quantity, 0);
}

function getSourceCounts(cards: EnrichedDeckCard[]) {
  return cards.reduce(
    (counts, card) => {
      if (!card.gameSourceInfo) {
        return {
          ...counts,
          missing: counts.missing + card.quantity,
        };
      }

      if (card.gameSourceInfo.status === "available") {
        return {
          ...counts,
          available: counts.available + card.quantity,
        };
      }

      if (card.gameSourceInfo.status === "not-in-game") {
        return {
          ...counts,
          notInGame: counts.notInGame + card.quantity,
        };
      }

      return {
        ...counts,
        missing: counts.missing + card.quantity,
      };
    },
    {
      available: 0,
      notInGame: 0,
      missing: 0,
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
    },
    {
      label: "Not in game",
      value: counts.notInGame,
      className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    },
    {
      label: "Missing source data",
      value: counts.missing,
      className: "border-slate-600 bg-slate-800 text-slate-300",
    },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">
          In-game source coverage
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Shows how much of this deck has known Nintendo Switch game pack source
          data.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {coverageItems.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border p-4 ${item.className}`}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="mt-2 text-3xl font-bold">{item.value}</p>
            <p className="mt-1 text-sm opacity-80">of {totalCards} cards</p>
          </div>
        ))}
      </div>
    </div>
  );
}