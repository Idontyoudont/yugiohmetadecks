type DeckFiltersProps = {
  availableTags: string[];
  selectedTag: string | null;
  searchQuery: string;
  onSelectTag: (tag: string | null) => void;
  onSearchChange: (query: string) => void;
};

export function DeckFilters({
  availableTags,
  selectedTag,
  searchQuery,
  onSelectTag,
  onSearchChange,
}: DeckFiltersProps) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          <p className="mt-1 text-sm text-slate-400">
            Search cards or filter the selected deck by custom card role.
          </p>
        </div>

        {selectedTag || searchQuery ? (
          <button
            onClick={() => {
              onSelectTag(null);
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
  );
}