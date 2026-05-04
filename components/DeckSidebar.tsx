import type { Deck } from "../types/deck";

type DeckSidebarProps = {
  decks: Deck[];
  selectedDeck: Deck;
  onSelectDeck: (deckId: string) => void;
};

function getStatusLabel(status: Deck["status"]) {
  if (status === "complete") {
    return "Complete";
  }

  if (status === "sample") {
    return "Sample";
  }

  return "Draft";
}

function getStatusClassName(status: Deck["status"]) {
  if (status === "complete") {
    return "bg-emerald-500/10 text-emerald-300";
  }

  if (status === "sample") {
    return "bg-amber-500/10 text-amber-300";
  }

  return "bg-slate-700 text-slate-300";
}

export function DeckSidebar({
  decks,
  selectedDeck,
  onSelectDeck,
}: DeckSidebarProps) {
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
            onClick={() => onSelectDeck(deck.id)}
            className={`w-full rounded-xl px-4 py-3 text-left transition ${
              deck.id === selectedDeck.id
                ? "bg-blue-500 text-white"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">{deck.name}</div>

              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${getStatusClassName(
                  deck.status
                )}`}
              >
                {getStatusLabel(deck.status)}
              </span>
            </div>

            <div className="mt-1 text-sm opacity-80">
              {deck.year} · {deck.format}
            </div>
          </button>
        ))}
      </nav>
    </aside>
  );
}