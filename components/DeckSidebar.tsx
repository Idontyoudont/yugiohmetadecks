import type { Deck } from "../types/deck";

type DeckSidebarProps = {
  decks: Deck[];
  selectedDeck: Deck;
};

export function DeckSidebar({ decks, selectedDeck }: DeckSidebarProps) {
  return (
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
  );
}