import type { DeckVariant } from "../types/deck";

type DeckVariantChangesProps = {
  variant: DeckVariant | null;
};

export function DeckVariantChanges({ variant }: DeckVariantChangesProps) {
  if (!variant) {
    return null;
  }

  return (
    <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Variant changes</h3>
        <p className="mt-1 text-sm text-blue-100/70">
          Changes applied in this deck version compared with the historical
          list.
        </p>
      </div>

      {variant.replacements.length === 0 ? (
        <div className="rounded-xl border border-blue-500/20 bg-slate-950/70 p-4">
          <p className="text-sm text-blue-100/70">
            No card replacements are defined for this variant.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {variant.replacements.map((replacement) => (
            <div
              key={`${replacement.from}-${replacement.to.name}`}
              className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Replace
                  </p>
                  <p className="mt-1 font-semibold text-slate-200">
                    {replacement.from}
                  </p>
                </div>

                <div className="hidden text-slate-500 md:block">→</div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    With
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-blue-300">
                      {replacement.to.name}
                    </p>
                    <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white">
                      x{replacement.to.quantity}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-400">
                {replacement.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}