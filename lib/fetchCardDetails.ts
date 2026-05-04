import type { CardDetails } from "../types/deck";

type YgoProDeckCard = {
  id: number;
  name: string;
  type: string;
  desc: string;
  attribute?: string;
  level?: number;
  rank?: number;
  linkval?: number;
  card_images?: {
    image_url?: string;
    image_url_small?: string;
    image_url_cropped?: string;
  }[];
};

type YgoProDeckResponse = {
  data?: YgoProDeckCard[];
  error?: string;
};

function getDisplayLevel(card: YgoProDeckCard) {
  return card.level ?? card.rank ?? card.linkval;
}

export async function fetchCardDetails(
  cardName: string
): Promise<CardDetails | null> {
  const endpoint = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(
    cardName
  )}`;

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as YgoProDeckResponse;
    const apiCard = result.data?.[0];

    if (!apiCard) {
      return null;
    }

    return {
      name: apiCard.name,
      imageUrl: apiCard.card_images?.[0]?.image_url,
      description: apiCard.desc,
      cardType: apiCard.type,
      attribute: apiCard.attribute,
      level: getDisplayLevel(apiCard),
    };
  } catch {
    return null;
  }
}