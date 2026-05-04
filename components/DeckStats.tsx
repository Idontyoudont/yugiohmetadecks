import type { EnrichedDeckCard } from "../types/deck";

type DeckStatsProps = {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
};

function countCards(cards: EnrichedDeckCard[]) {
  return cards.reduce((total, card) => total + card.quantity, 0);
}

export function DeckStats({ mainDeck, extraDeck, sideDeck }: DeckStatsProps) {
  const mainDeckCount = countCards(mainDeck);
  const extraDeckCount = countCards(extraDeck);
  const sideDeckCount = countCards(sideDeck);
  const totalCount = mainDeckCount + extraDeckCount + sideDeckCount;

  const stats = [
    {
      label: "Main Deck",
      value: mainDeckCount,
    },
    {
      label: "Extra Deck",
      value: extraDeckCount,
    },
    {
      label: "Side Deck",
      value: sideDeckCount,
    },
    {
      label: "Total",
      value: totalCount,
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {stat.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
          <p className="mt-1 text-sm text-slate-400">cards</p>
        </div>
      ))}
    </div>
  );
}