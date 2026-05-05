import { useEffect, useState } from "react";
import { enrichCardByName } from "../lib/enrichDeckCard";
import {
  fetchCardDetails,
  getCachedCardDetails,
} from "../lib/fetchCardDetails";
import {
  getCardAvailabilityBadgeClassName,
  getCardAvailabilityLabel,
  getCardAvailabilityReason,
  isCardAvailableInGame,
} from "../lib/cardAvailability";
import type { BanlistInfo, CardDetails, EnrichedDeckCard } from "../types/deck";

type CardPreviewPanelProps = {
  card: EnrichedDeckCard | null;
  onClose?: () => void;
  onPreviewCard?: (card: EnrichedDeckCard) => void;
};

function getCardWithApiDetails(
  card: EnrichedDeckCard,
  apiDetails: CardDetails | null
): EnrichedDeckCard {
  if (!apiDetails) {
    return card;
  }

  return {
    ...card,
    imageUrl: apiDetails.imageUrl ?? card.imageUrl,
    description: apiDetails.description ?? card.description,
    cardType: apiDetails.cardType ?? card.cardType,
    attribute: apiDetails.attribute ?? card.attribute,
    level: apiDetails.level ?? card.level,
  };
}

function getBanlistClassName(banlistInfo: BanlistInfo) {
  if (banlistInfo.status === "forbidden") {
    return "border-red-500/50 bg-red-500/15 text-red-100";
  }

  if (banlistInfo.status === "limited") {
    return "border-orange-500/50 bg-orange-500/15 text-orange-100";
  }

  return "border-yellow-400/50 bg-yellow-400/15 text-yellow-100";
}

function getBanlistTitle(banlistInfo: BanlistInfo) {
  if (banlistInfo.allowedCopies === 0) {
    return "Forbidden: 0 copies allowed";
  }

  if (banlistInfo.allowedCopies === 1) {
    return "Limited: 1 copy allowed";
  }

  return "Semi-limited: 2 copies allowed";
}

function CardPreviewContent({
  card,
  onPreviewCard,
}: {
  card: EnrichedDeckCard | null;
  onPreviewCard?: (card: EnrichedDeckCard) => void;
}) {
  const [apiDetails, setApiDetails] = useState<CardDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadCardDetails() {
      if (!card) {
        setApiDetails(null);
        return;
      }

      const cachedDetails = getCachedCardDetails(card.name);

      if (cachedDetails) {
        setApiDetails(cachedDetails);
        return;
      }

      setIsLoadingDetails(true);
      const details = await fetchCardDetails(card.name);

      if (isActive) {
        setApiDetails(details);
        setIsLoadingDetails(false);
      }
    }

    loadCardDetails();

    return () => {
      isActive = false;
    };
  }, [card?.name]);

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

  const displayCard = getCardWithApiDetails(card, apiDetails);
  const gameSourceInfo = displayCard.gameSourceInfo;
  const replacementInfo = displayCard.replacementInfo;
  const banlistInfo = displayCard.banlistInfo;
  const isAvailable = isCardAvailableInGame(displayCard);

  function handleReplacementClick(cardName: string) {
    const replacementCard = enrichCardByName(cardName);
    onPreviewCard?.(replacementCard);
  }

  return (
    <div className="sticky top-6">
      {displayCard.imageUrl ? (
        <img
          src={displayCard.imageUrl}
          alt={displayCard.name}
          className="mb-5 w-full rounded-2xl shadow-2xl"
        />
      ) : (
        <div className="mb-5 aspect-[3/4] rounded-2xl bg-gradient-to-br from-slate-700 to-slate-950 shadow-2xl" />
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-white">{displayCard.name}</h2>
          <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-bold text-white">
            x{displayCard.quantity}
          </span>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {banlistInfo ? (
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white ring-2 ring-red-300/70">
              {getBanlistTitle(banlistInfo)}
            </span>
          ) : null}

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getCardAvailabilityBadgeClassName(
              displayCard
            )}`}
          >
            {getCardAvailabilityLabel(displayCard)}
          </span>

          {!isAvailable ? (
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              {getCardAvailabilityReason(displayCard)}
            </span>
          ) : null}
        </div>

        {banlistInfo ? (
          <div
            className={`mb-5 rounded-xl border p-4 ${getBanlistClassName(
              banlistInfo
            )}`}
          >
            <p className="font-black">{getBanlistTitle(banlistInfo)}</p>
            <p className="mt-2 text-sm opacity-80">
              This card is on the {banlistInfo.listName}, effective{" "}
              {banlistInfo.effectiveDate}. Normal cards are allowed up to 3
              copies, but this card is capped at {banlistInfo.allowedCopies}.
            </p>
          </div>
        ) : null}

        {isLoadingDetails ? (
          <div className="mb-5 rounded-xl bg-slate-950 p-3 text-sm text-slate-400">
            Loading card details from API...
          </div>
        ) : null}

        <div className="mb-5 grid grid-cols-2 gap-2 text-sm">
          {displayCard.cardType ? (
            <div className="rounded-xl bg-slate-950 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Type
              </p>
              <p className="mt-1 text-slate-200">{displayCard.cardType}</p>
            </div>
          ) : null}

          {displayCard.attribute ? (
            <div className="rounded-xl bg-slate-950 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Attribute
              </p>
              <p className="mt-1 text-slate-200">{displayCard.attribute}</p>
            </div>
          ) : null}

          {displayCard.level ? (
            <div className="rounded-xl bg-slate-950 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Level / Rank / Link
              </p>
              <p className="mt-1 text-slate-200">{displayCard.level}</p>
            </div>
          ) : null}
        </div>

        {displayCard.tags && displayCard.tags.length > 0 ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {displayCard.tags.map((tag) => (
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
            {displayCard.description ??
              "No card description is available yet for this card."}
          </p>

          <div className="rounded-xl bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-400">
              In-game source
            </p>

            {!isAvailable ? (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="font-semibold text-amber-300">
                  Unavailable / needs replacement
                </p>
                <p className="mt-2 text-sm text-amber-100/70">
                  Reason: {getCardAvailabilityReason(displayCard)}
                </p>
                {gameSourceInfo?.notes ? (
                  <p className="mt-2 text-sm text-amber-100/70">
                    {gameSourceInfo.notes}
                  </p>
                ) : null}
              </div>
            ) : null}

            {isAvailable &&
            gameSourceInfo?.sources &&
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
                  const firstSource = replacementCard.gameSourceInfo?.sources?.[0];
                  const replacementIsAvailable =
                    isCardAvailableInGame(replacementCard);

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

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                        {replacementCard.banlistInfo ? (
                          <span className="rounded-full bg-red-600 px-2 py-1 font-black text-white">
                            {getBanlistTitle(replacementCard.banlistInfo)}
                          </span>
                        ) : null}

                        <span
                          className={`rounded-full px-2 py-1 ${getCardAvailabilityBadgeClassName(
                            replacementCard
                          )}`}
                        >
                          {getCardAvailabilityLabel(replacementCard)}
                        </span>

                        {!replacementIsAvailable ? (
                          <span className="rounded-full bg-slate-800 px-2 py-1">
                            {getCardAvailabilityReason(replacementCard)}
                          </span>
                        ) : null}

                        {replacementIsAvailable && firstSource ? (
                          <>
                            <span className="rounded-full bg-slate-800 px-2 py-1">
                              {firstSource.packName}
                            </span>
                            {firstSource.cardCategory ? (
                              <span className="rounded-full bg-slate-800 px-2 py-1">
                                {firstSource.cardCategory}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </div>

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
              Data source
            </p>
            <ul className="mt-3 space-y-2">
              <li>Card details: YGOPRODeck API with local fallback</li>
              <li>In-game pack sources: curated Legacy of the Duelist data</li>
              <li>Deck variants: curated app data</li>
              <li>Banlist: March 2021 TCG Forbidden & Limited List</li>
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