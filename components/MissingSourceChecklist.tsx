import type { EnrichedDeckCard } from "../types/deck";

type MissingSourceChecklistProps = {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
  onSelectCard: (card: EnrichedDeckCard) => void;
};

type MissingSourceItem = {
  section: "Main Deck" | "Extra Deck" | "Side Deck";
  card: EnrichedDeckCard;
};

function getMissingSourceCards({
  mainDeck,
  extraDeck,
  sideDeck,
}: {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
}) {
  const items: MissingSourceItem[] = [];

  mainDeck.forEach((card) => {
    if (!card.gameSourceInfo) {
      items.push({ section: "Main Deck", card });
    }
  });

  extraDeck.forEach((card) => {
    if (!card.gameSourceInfo) {
      items.push({ section: "Extra Deck", card });
    }
  });

  sideDeck.forEach((card) => {
    if (!card.gameSourceInfo) {
      items.push({ section: "Side Deck", card });
    }
  });

  return items;
}

export function MissingSourceChecklist({
  mainDeck,
  extraDeck,
  sideDeck,
  onSelectCard,
}: MissingSourceChecklistProps) {
  const missingSourceCards = getMissingSourceCards({
    mainDeck,
    extraDeck,
    sideDeck,
  });

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">
          Missing source checklist
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Cards that still need an in-game pack source mapping.
        </p>
      </div>

      {missingSourceCards.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="font-semibold text-emerald-300">
            No missing source data
          </p>
          <p className="mt-2 text-sm text-emerald-100/70">
            Every card in this deck currently has either an available source or
            a not-in-game status.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {missingSourceCards.map(({ section, card }) => (
            <button
              key={`${section}-${card.name}`}
              onClick={() => onSelectCard(card)}
              className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-left transition hover:border-blue-400 hover:bg-slate-800"
            >
              <div>
                <p className="font-medium text-white">{card.name}</p>
                <p className="mt-1 text-sm text-slate-500">{section}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white">
                  x{card.quantity}
                </span>
                <span className="rounded-full bg-slate-700 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Missing
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}