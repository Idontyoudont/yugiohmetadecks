export type Deck = {
  id: string;
  name: string;
  year: number;
  format: string;
  mainDeck: string[];
  extraDeck: string[];
  sideDeck: string[];
};