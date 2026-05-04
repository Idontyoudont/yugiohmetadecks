import type { EnrichedDeckCard } from "../types/deck";

type DeckValidationProps = {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
};

function countCards(cards: EnrichedDeckCard[]) {
  return cards.reduce((total, card) => total + card.quantity, 0);
}

function getStatus(isValid: boolean) {
  return isValid
    ? {
        label: "Valid",
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      }
    : {
        label: "Needs attention",
        className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
      };
}

export function DeckValidation({
  mainDeck,
  extraDeck,
  sideDeck,
}: DeckValidationProps) {
  const mainDeckCount = countCards(mainDeck);
  const extraDeckCount = countCards(extraDeck);
  const sideDeckCount = countCards(sideDeck);

  const rules = [
    {
      label: "Main Deck",
      count: mainDeckCount,
      requirement: "40 to 60 cards",
      isValid: mainDeckCount >= 40 && mainDeckCount <= 60,
    },
    {
      label: "Extra Deck",
      count: extraDeckCount,
      requirement: "0 to 15 cards",
      isValid: extraDeckCount >= 0 && extraDeckCount <= 15,
    },
    {
      label: "Side Deck",
      count: sideDeckCount,
      requirement: "0 or 15 cards",
      isValid: sideDeckCount === 0 || sideDeckCount === 15,
    },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Deck validation</h3>
        <p className="mt-1 text-sm text-slate-400">
          Quick format checks based on standard Yu-Gi-Oh deck size rules.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {rules.map((rule) => {
          const status = getStatus(rule.isValid);

          return (
            <div
              key={rule.label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{rule.label}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {rule.count} cards
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                >
                  {status.label}
                </span>
              </div>

              <p className="text-sm text-slate-500">
                Requirement: {rule.requirement}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}