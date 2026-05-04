export type DeckCard = {
  name: string;
  quantity: number;
  tags?: string[];
  imageUrl?: string;
  description?: string;
  cardType?: string;
  attribute?: string;
  level?: number;
};

export type Deck = {
  id: string;
  name: string;
  year: number;
  format: string;
  mainDeck: DeckCard[];
  extraDeck: DeckCard[];
  sideDeck: DeckCard[];
};