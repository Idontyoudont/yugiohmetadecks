import type { DeckCard } from "../types/deck";

type CardPreviewPanelProps = {
  card: DeckCard | null;
};

export function CardPreviewPanel({ card }: CardPreviewPanelProps) {
  if (!card) {
    return (
      <aside className="hidden w-80 border-l border-slate-800 bg-slate-950 p-6 xl:block">
        <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center">
          <div className="mx-auto mb-4 aspect-[3/4] w-32 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950" />
          <h2 className="text-lg font-semibold text-white">No card selected</h2>
          <p className="mt-2 text-sm text-slate-400">
            Click a card in the deck list to preview details here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-80 border-l border-slate-800 bg-slate-950 p-6 xl:block">
      <div className="sticky top-6">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="mb-5 w-full rounded-2xl shadow-2xl"
          />
        ) : (
          <div className="mb-5 aspect-[3/4] rounded-2xl bg-gradient-to-br from-slate-700 to-slate-950 shadow-2xl" />
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-white">{card.name}</h2>
            <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-bold text-white">
              x{card.quantity}
            </span>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 text-sm">
            {card.cardType ? (
              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Type
                </p>
                <p className="mt-1 text-slate-200">{card.cardType}</p>
              </div>
            ) : null}

            {card.attribute ? (
              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Attribute
                </p>
                <p className="mt-1 text-slate-200">{card.attribute}</p>
              </div>
            ) : null}

            {card.level ? (
              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Level
                </p>
                <p className="mt-1 text-slate-200">{card.level}</p>
              </div>
            ) : null}
          </div>

          {card.tags && card.tags.length > 0 ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="space-y-4 text-sm text-slate-400">
            <p>
              {card.description ??
                "This is a placeholder card preview. Later, this panel can show the real card image, type, attribute, level, effect text, printings, and set information."}
            </p>

            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-400">
                Future data
              </p>
              <ul className="mt-3 space-y-2">
                <li>Full official card text</li>
                <li>Sets and rarity</li>
                <li>Card prices or availability</li>
                <li>Custom role explanation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}