import type { EnrichedDeckCard } from "../types/deck";

type DeckPackSummaryProps = {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
  selectedPack: string | null;
  onSelectPack: (packName: string) => void;
};

type PackCount = {
  packName: string;
  count: number;
};

function getPackCounts(cards: EnrichedDeckCard[]) {
  const packCounts = new Map<string, number>();

  cards.forEach((card) => {
    if (card.gameSourceInfo?.status !== "available") {
      return;
    }

    const firstSource = card.gameSourceInfo.sources?.[0];

    if (!firstSource) {
      return;
    }

    const currentCount = packCounts.get(firstSource.packName) ?? 0;
    packCounts.set(firstSource.packName, currentCount + card.quantity);
  });

  return Array.from(packCounts.entries())
    .map<PackCount>(([packName, count]) => ({
      packName,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.packName.localeCompare(b.packName));
}

export function DeckPackSummary({
  mainDeck,
  extraDeck,
  sideDeck,
  selectedPack,
  onSelectPack,
}: DeckPackSummaryProps) {
  const allCards = [...mainDeck, ...extraDeck, ...sideDeck];
  const packCounts = getPackCounts(allCards);

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Pack summary</h3>
        <p className="mt-1 text-sm text-slate-400">
          Click a pack to filter the deck by that in-game source.
        </p>
      </div>

      {packCounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-5 text-center">
          <p className="font-medium text-slate-300">
            No available pack sources yet.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Add in-game source data to cards to populate this summary.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {packCounts.map((pack) => {
            const isSelected = selectedPack === pack.packName;

            return (
              <button
                key={pack.packName}
                onClick={() => onSelectPack(pack.packName)}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-1 hover:border-blue-400 ${
                  isSelected
                    ? "border-blue-400 bg-blue-500/10"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-white">{pack.packName}</p>

                  {isSelected ? (
                    <span className="rounded-full bg-blue-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Active
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 text-3xl font-bold text-blue-300">
                  {pack.count}
                </p>
                <p className="mt-1 text-sm text-slate-400">card copies</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}