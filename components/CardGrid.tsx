import type { DeckCard } from "../types/deck";

type CardGridProps = {
  title: string;
  cards: DeckCard[];
};

export function CardGrid({ title, cards }: CardGridProps) {
  const totalCards = cards.reduce((total, card) => total + card.quantity, 0);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
          {totalCards} cards
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {cards.map((card) => (
          <button
            key={card.name}
            className="relative min-h-36 rounded-xl border border-slate-700 bg-slate-800 p-3 text-left text-sm text-slate-100 transition hover:-translate-y-1 hover:border-blue-400 hover:bg-slate-700"
          >
            <span className="absolute right-2 top-2 rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white">
              x{card.quantity}
            </span>

            <div className="mb-3 aspect-[3/4] rounded-lg bg-gradient-to-br from-slate-700 to-slate-950" />

            <p className="font-medium leading-snug">{card.name}</p>

            {card.tags && card.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {card.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}