type CardGridProps = {
  title: string;
  cards: string[];
};

export function CardGrid({ title, cards }: CardGridProps) {
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