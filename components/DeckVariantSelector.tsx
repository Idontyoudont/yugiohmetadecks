import type { DeckVariant } from "../types/deck";

type DeckVariantSelectorProps = {
  variants: DeckVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string | null) => void;
};

export function DeckVariantSelector({
  variants,
  selectedVariantId,
  onSelectVariant,
}: DeckVariantSelectorProps) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Deck version</h3>
        <p className="mt-1 text-sm text-slate-400">
          Switch between the historical decklist and game-compatible variants.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          onClick={() => onSelectVariant(null)}
          className={`rounded-2xl border p-4 text-left transition hover:border-blue-400 ${
            selectedVariantId === null
              ? "border-blue-400 bg-blue-500/10"
              : "border-slate-800 bg-slate-900"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-white">Historical version</p>

            {selectedVariantId === null ? (
              <span className="rounded-full bg-blue-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                Active
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-slate-400">
            The original historical decklist, even if some cards are not
            available in the Switch game.
          </p>
        </button>

        {variants.map((variant) => {
          const isSelected = selectedVariantId === variant.id;

          return (
            <button
              key={variant.id}
              onClick={() => onSelectVariant(variant.id)}
              className={`rounded-2xl border p-4 text-left transition hover:border-blue-400 ${
                isSelected
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-white">{variant.name}</p>

                {isSelected ? (
                  <span className="rounded-full bg-blue-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Active
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-sm text-slate-400">
                {variant.description}
              </p>

              {variant.replacements.length > 0 ? (
                <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
                  {variant.replacements.map((replacement) => (
                    <div
                      key={`${replacement.from}-${replacement.to.name}`}
                      className="rounded-xl bg-slate-950 px-3 py-2"
                    >
                      <p className="text-sm text-slate-300">
                        <span className="text-slate-500">Replace:</span>{" "}
                        {replacement.from}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        <span className="text-slate-500">With:</span>{" "}
                        {replacement.to.name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}