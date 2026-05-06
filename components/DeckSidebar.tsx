import type { Deck } from "../types/deck";

type YearFilter = number | "all";

type DeckSidebarProps = {
  decks: Deck[];
  selectedDeck: Deck;
  selectedYear: YearFilter;
  availableYears: number[];
  yearCounts: Record<number, number>;
  onSelectYear: (year: YearFilter) => void;
  onSelectDeck: (deckId: string) => void;
  onRequestClose?: () => void;
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

function groupDecksByYear(decks: Deck[]) {
  return decks.reduce<Record<number, Deck[]>>((groups, deck) => {
    if (!groups[deck.year]) {
      groups[deck.year] = [];
    }

    groups[deck.year].push(deck);
    return groups;
  }, {});
}

export function DeckSidebar({
  decks,
  selectedDeck,
  selectedYear,
  availableYears,
  yearCounts,
  onSelectYear,
  onSelectDeck,
  onRequestClose,
}: DeckSidebarProps) {
  const decksByYear = groupDecksByYear(decks);
  const visibleYears = Object.keys(decksByYear)
    .map(Number)
    .sort((yearA, yearB) => yearA - yearB);

  function handleSelectDeck(deckId: string) {
    onSelectDeck(deckId);
    onRequestClose?.();
  }

  return (
    <aside className="h-full w-80 shrink-0 overflow-y-auto overscroll-contain border-r border-slate-800 bg-slate-950 p-6 lg:h-screen">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
            Yu-Gi-Oh
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Meta Decks</h1>
        </div>

        {onRequestClose ? (
          <button
            onClick={onRequestClose}
            className="rounded-full bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 lg:hidden"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <label
          htmlFor="deck-year-filter"
          className="text-xs uppercase tracking-[0.25em] text-slate-500"
        >
          Year filter
        </label>

        <select
          id="deck-year-filter"
          value={selectedYear}
          onChange={(event) => {
            const value = event.target.value;
            onSelectYear(value === "all" ? "all" : Number(value));
          }}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 outline-none transition focus:border-blue-500"
        >
          <option value="all">All years ({decks.length})</option>

          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year} ({yearCounts[year] ?? 0})
            </option>
          ))}
        </select>

        <p className="mt-2 text-xs text-slate-500">
          Showing {decks.length} deck{decks.length === 1 ? "" : "s"}
          {selectedYear === "all" ? "" : ` from ${selectedYear}`}.
        </p>
      </div>

      <nav className="space-y-5">
        {visibleYears.map((year) => (
          <section key={year}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                {year}
              </h2>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                {decksByYear[year].length}
              </span>
            </div>

            <div className="space-y-2">
              {decksByYear[year].map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => handleSelectDeck(deck.id)}
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
                        deck.status,
                      )}`}
                    >
                      {getStatusLabel(deck.status)}
                    </span>
                  </div>

                  <div className="mt-1 text-sm opacity-80">{deck.format}</div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
