export type DeckCard = {
  name: string;
  quantity: number;
  tags?: string[];
};

export type CardDetails = {
  name: string;
  imageUrl?: string;
  description?: string;
  cardType?: string;
  attribute?: string;
  level?: number;
};

export type EnrichedDeckCard = DeckCard & CardDetails;

export type Deck = {
  id: string;
  name: string;
  year: number;
  format: string;
  mainDeck: DeckCard[];
  extraDeck: DeckCard[];
  sideDeck: DeckCard[];
};