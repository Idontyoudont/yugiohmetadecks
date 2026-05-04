type DeckFiltersProps = {
  availableTags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
};

export function DeckFilters({
  availableTags,
  selectedTag,
  onSelectTag,
}: DeckFiltersProps) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          <p className="mt-1 text-sm text-slate-400">
            Filter the selected deck by custom card role.
          </p>
        </div>

        {selectedTag ? (
          <button
            onClick={() => onSelectTag(null)}
            className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            Clear filter
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectTag(null)}
          className={`rounded-full px-3 py-2 text-sm font-medium transition ${
            selectedTag === null
              ? "bg-blue-500 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          All cards
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