import { enrichCardByName } from "../lib/enrichDeckCard";
import type { EnrichedDeckCard } from "../types/deck";

type CardPreviewPanelProps = {
  card: EnrichedDeckCard | null;
  onClose?: () => void;
  onPreviewCard?: (card: EnrichedDeckCard) => void;
};

function CardPreviewContent({
  card,
  onPreviewCard,
}: {
  card: EnrichedDeckCard | null;
  onPreviewCard?: (card: EnrichedDeckCard) => void;
}) {
  if (!card) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center">
        <div className="mx-auto mb-4 aspect-[3/4] w-32 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950" />
        <h2 className="text-lg font-semibold text-white">No card selected</h2>
        <p className="mt-2 text-sm text-slate-400">
          Click a card in the deck list to preview details here.
        </p>
      </div>
    );
  }

  const gameSourceInfo = card.gameSourceInfo;
  const replacementInfo = card.replacementInfo;

  function handleReplacementClick(cardName: string) {
    const replacementCard = enrichCardByName(cardName);
    onPreviewCard?.(replacementCard);
  }

  return (
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
              "This is a placeholder card preview. Later, this panel can show the real card image, type, attribute, level, official effect text, in-game pack source, and custom role explanation."}
          </p>

          <div className="rounded-xl bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-400">
              In-game source
            </p>

            {!gameSourceInfo ? (
              <p className="mt-3 text-sm text-slate-500">
                No in-game pack source added yet for this card.
              </p>
            ) : null}

            {gameSourceInfo?.status === "not-in-game" ? (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="font-semibold text-amber-300">Not in game</p>
                {gameSourceInfo.notes ? (
                  <p className="mt-2 text-sm text-amber-100/70">
                    {gameSourceInfo.notes}
                  </p>
                ) : null}
              </div>
            ) : null}

            {gameSourceInfo?.status === "unknown" ? (
              <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-3">
                <p className="font-semibold text-slate-300">Unknown</p>
                {gameSourceInfo.notes ? (
                  <p className="mt-2 text-sm text-slate-500">
                    {gameSourceInfo.notes}
                  </p>
                ) : null}
              </div>
            ) : null}

            {gameSourceInfo?.status === "available" &&
            gameSourceInfo.sources &&
            gameSourceInfo.sources.length > 0 ? (
              <div className="mt-3 space-y-3">
                {gameSourceInfo.sources.map((source) => (
                  <div
                    key={`${source.game}-${source.packName}-${
                      source.cardCategory ?? ""
                    }`}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-3"
                  >
                    <p className="font-medium text-slate-200">
                      {source.packName}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="rounded-full bg-slate-800 px-2 py-1">
                        {source.game}
                      </span>

                      {source.characterName ? (
                        <span className="rounded-full bg-slate-800 px-2 py-1">
                          {source.characterName}
                        </span>
                      ) : null}

                      {source.cardCategory ? (
                        <span className="rounded-full bg-slate-800 px-2 py-1">
                          {source.cardCategory}
                        </span>
                      ) : null}
                    </div>

                    {source.notes ? (
                      <p className="mt-3 text-sm text-slate-500">
                        {source.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {replacementInfo && replacementInfo.suggestions.length > 0 ? (
            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-400">
                Replacement suggestions
              </p>

              <div className="mt-3 space-y-3">
                {replacementInfo.suggestions.map((suggestion) => {
                  const replacementCard = enrichCardByName(suggestion.cardName);
                  const sourceInfo = replacementCard.gameSourceInfo;
                  const firstSource = sourceInfo?.sources?.[0];

                  return (
                    <button
                      key={suggestion.cardName}
                      onClick={() =>
                        handleReplacementClick(suggestion.cardName)
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-blue-400 hover:bg-slate-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-slate-200">
                          {suggestion.cardName}
                        </p>

                        <span className="rounded-full bg-blue-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                          Preview
                        </span>
                      </div>

                      {sourceInfo?.status === "available" && firstSource ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300">
                            Available
                          </span>
                          <span className="rounded-full bg-slate-800 px-2 py-1">
                            {firstSource.packName}
                          </span>
                          {firstSource.cardCategory ? (
                            <span className="rounded-full bg-slate-800 px-2 py-1">
                              {firstSource.cardCategory}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {sourceInfo?.status === "not-in-game" ? (
                        <div className="mt-2 inline-flex rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                          Not in game
                        </div>
                      ) : null}

                      {sourceInfo?.status === "unknown" ? (
                        <div className="mt-2 inline-flex rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                          Source unknown
                        </div>
                      ) : null}

                      {!sourceInfo ? (
                        <div className="mt-2 inline-flex rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                          Source not mapped yet
                        </div>
                      ) : null}

                      <p className="mt-2 text-sm text-slate-500">
                        {suggestion.reason}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-400">
              Future data
            </p>
            <ul className="mt-3 space-y-2">
              <li>Full official card text</li>
              <li>More in-game pack sources</li>
              <li>Card unlock notes</li>
              <li>Custom role explanation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardPreviewPanel({
  card,
  onClose,
  onPreviewCard,
}: CardPreviewPanelProps) {
  return (
    <>
      <aside className="hidden w-80 border-l border-slate-800 bg-slate-950 p-6 xl:block">
        <CardPreviewContent card={card} onPreviewCard={onPreviewCard} />
      </aside>

      {card ? (
        <div className="fixed inset-0 z-50 bg-black/70 xl:hidden">
          <button
            aria-label="Close card preview"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-700 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
                Card preview
              </p>
              <button
                onClick={onClose}
                className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <CardPreviewContent card={card} onPreviewCard={onPreviewCard} />
          </div>
        </div>
      ) : null}
    </>
  );
}