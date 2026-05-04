export type DeckCard = {
  name: string;
  quantity: number;
  tags?: string[];
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