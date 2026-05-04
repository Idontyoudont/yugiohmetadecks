import type { EnrichedDeckCard } from "../types/deck";

type DeckPackSummaryProps = {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
  selectedPack: string | null;
  onSelectPack: (packName: string | null) => void;
};

type PackCard = {
  name: string;
  quantity: number;
  section: "Main Deck" | "Extra Deck" | "Side Deck";
};

type PackCount = {
  packName: string;
  count: number;
  cards: PackCard[];
};

function getCardPackNames(card: EnrichedDeckCard) {
  if (card.gameSourceInfo?.status !== "available") {
    return [];
  }

  return card.gameSourceInfo.sources?.map((source) => source.packName) ?? [];
}

function addCardsToPackCounts(
  packCounts: Map<string, PackCount>,
  cards: EnrichedDeckCard[],
  section: PackCard["section"]
) {
  cards.forEach((card) => {
    const packNames = getCardPackNames(card);

    packNames.forEach((packName) => {
      const existingPack = packCounts.get(packName);

      if (!existingPack) {
        packCounts.set(packName, {
          packName,
          count: card.quantity,
          cards: [
            {
              name: card.name,
              quantity: card.quantity,
              section,
            },
          ],
        });

        return;
      }

      existingPack.count += card.quantity;
      existingPack.cards.push({
        name: card.name,
        quantity: card.quantity,
        section,
      });
    });
  });
}

function getPackCounts({
  mainDeck,
  extraDeck,
  sideDeck,
}: {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
}) {
  const packCounts = new Map<string, PackCount>();

  addCardsToPackCounts(packCounts, mainDeck, "Main Deck");
  addCardsToPackCounts(packCounts, extraDeck, "Extra Deck");
  addCardsToPackCounts(packCounts, sideDeck, "Side Deck");

  return Array.from(packCounts.values()).sort(
    (a, b) => b.count - a.count || a.packName.localeCompare(b.packName)
  );
}

export function DeckPackSummary({
  mainDeck,
  extraDeck,
  sideDeck,
  selectedPack,
  onSelectPack,
}: DeckPackSummaryProps) {
  const packCounts = getPackCounts({
    mainDeck,
    extraDeck,
    sideDeck,
  });

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Pack summary</h3>
        <p className="mt-1 text-sm text-slate-400">
          Click a pack to filter the deck and see which cards come from that
          in-game source.
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
                onClick={() =>
                  onSelectPack(isSelected ? null : pack.packName)
                }
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

                {isSelected ? (
                  <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
                    {pack.cards.map((card) => (
                      <div
                        key={`${pack.packName}-${card.section}-${card.name}`}
                        className="rounded-xl bg-slate-950 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {card.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {card.section}
                            </p>
                          </div>

                          <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white">
                            x{card.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}