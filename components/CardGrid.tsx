"use client";

import { useEffect, useState } from "react";
import {
  fetchCardDetails,
  getCachedCardDetails,
} from "../lib/fetchCardDetails";
import {
  getCardAvailabilityBadgeClassName,
  getCardAvailabilityLabel,
} from "../lib/cardAvailability";
import type { EnrichedDeckCard } from "../types/deck";

type CardGridProps = {
  title: string;
  cards: EnrichedDeckCard[];
  selectedCard?: EnrichedDeckCard | null;
  onSelectCard: (card: EnrichedDeckCard) => void;
};

function getSourceBadge(card: EnrichedDeckCard) {
  return {
    label: getCardAvailabilityLabel(card),
    className: getCardAvailabilityBadgeClassName(card),
  };
}

function ApiCardImage({ card }: { card: EnrichedDeckCard }) {
  const cachedDetails = getCachedCardDetails(card.name);
  const [imageUrl, setImageUrl] = useState<string | null>(
    card.imageUrl ?? cachedDetails?.imageUrl ?? null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadImage() {
      if (card.imageUrl) {
        setImageUrl(card.imageUrl);
        return;
      }

      const existingDetails = getCachedCardDetails(card.name);

      if (existingDetails?.imageUrl) {
        setImageUrl(existingDetails.imageUrl);
        return;
      }

      setIsLoading(true);
      const details = await fetchCardDetails(card.name);

      if (isActive) {
        setImageUrl(details?.imageUrl ?? null);
        setIsLoading(false);
      }
    }

    loadImage();

    return () => {
      isActive = false;
    };
  }, [card.name, card.imageUrl]);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={card.name}
        className="mb-3 aspect-[3/4] w-full rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="mb-3 flex aspect-[3/4] items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-950 px-2 text-center text-[10px] text-slate-500">
      {isLoading ? "Loading image..." : "No image"}
    </div>
  );
}

export function CardGrid({
  title,
  cards,
  selectedCard,
  onSelectCard,
}: CardGridProps) {
  const totalCards = cards.reduce((total, card) => total + card.quantity, 0);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
          {totalCards} cards
        </span>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center">
          <p className="font-medium text-slate-300">
            No matching cards in this section.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Try clearing the search or changing the selected filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {cards.map((card) => {
            const isSelected = selectedCard?.name === card.name;
            const sourceBadge = getSourceBadge(card);

            return (
              <button
                key={card.name}
                onClick={() => onSelectCard(card)}
                className={`relative min-h-36 rounded-xl border p-3 text-left text-sm text-slate-100 transition hover:-translate-y-1 hover:border-blue-400 hover:bg-slate-700 ${
                  isSelected
                    ? "border-blue-400 bg-slate-700"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                <span className="absolute right-2 top-2 z-10 rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white">
                  x{card.quantity}
                </span>

                <ApiCardImage card={card} />

                <span
                  className={`mb-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${sourceBadge.className}`}
                >
                  {sourceBadge.label}
                </span>

                <p className="font-medium leading-snug">{card.name}</p>

                {card.tags && card.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {card.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}