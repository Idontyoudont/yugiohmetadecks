import type { CardGameSourceInfo } from "../types/deck";

type SourceStatusFilter = CardGameSourceInfo["status"] | "missing" | null;

type DeckFiltersProps = {
  availableTags: string[];
  availablePacks: string[];
  selectedTag: string | null;
  selectedSourceStatus: SourceStatusFilter;
  selectedPack: string | null;
  searchQuery: string;
  onSelectTag: (tag: string | null) => void;
  onSelectSourceStatus: (status: SourceStatusFilter) => void;
  onSelectPack: (pack: string | null) => void;
  onSearchChange: (query: string) => void;
};

const sourceStatusOptions: {
  label: string;
  value: SourceStatusFilter;
}[] = [
  {
    label: "All source statuses",
    value: null,
  },
  {
    label: "Available in game",
    value: "available",
  },
  {
    label: "Not in game",
    value: "not-in-game",
  },
  {
    label: "Missing source data",
    value: "missing",
  },
];

export function DeckFilters({
  availableTags,
  availablePacks,
  selectedTag,
  selectedSourceStatus,
  selectedPack,
  searchQuery,
  onSelectTag,
  onSelectSourceStatus,
  onSelectPack,
  onSearchChange,
}: DeckFiltersProps) {
  const hasActiveFilters =
    selectedTag || selectedSourceStatus || selectedPack || searchQuery;

  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          <p className="mt-1 text-sm text-slate-400">
            Search cards, filter by role, pack, or in-game source status.
          </p>
        </div>

        {hasActiveFilters ? (
          <button
            onClick={() => {
              onSelectTag(null);
              onSelectSourceStatus(null);
              onSelectPack(null);
              onSearchChange("");
            }}
            className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <input
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search card name..."
        className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400"
      />

      <div className="mb-4">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          Pack
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectPack(null)}
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
              selectedPack === null
                ? "bg-blue-500 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All packs
          </button>

          {availablePacks.map((pack) => (
            <button
              key={pack}
              onClick={() => onSelectPack(pack)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                selectedPack === pack
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {pack}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          Source status
        </p>

        <div className="flex flex-wrap gap-2">
          {sourceStatusOptions.map((option) => (
            <button
              key={option.label}
              onClick={() => onSelectSourceStatus(option.value)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                selectedSourceStatus === option.value
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          Tags
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectTag(null)}
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
              selectedTag === null
                ? "bg-blue-500 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All tags
          </button>

          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(tag)}
              className={`rounded-full px-3 py-2 text-sm font-medium capitalize transition ${
                selectedTag === tag
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}