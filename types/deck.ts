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

export type CardGameSource = {
  game: string;
  packName: string;
  characterName?: string;
  cardCategory?: string;
  notes?: string;
};

export type CardGameSourceInfo = {
  name: string;
  status: "available" | "not-in-game" | "unknown";
  sources?: CardGameSource[];
  notes?: string;
};

export type ReplacementSuggestion = {
  cardName: string;
  reason: string;
};

export type CardReplacementInfo = {
  name: string;
  suggestions: ReplacementSuggestion[];
};

export type EnrichedDeckCard = DeckCard &
  CardDetails & {
    gameSourceInfo?: CardGameSourceInfo;
    replacementInfo?: CardReplacementInfo;
  };

export type DeckStatus = "complete" | "sample" | "draft";

export type Deck = {
  id: string;
  name: string;
  year: number;
  format: string;
  status: DeckStatus;
  mainDeck: DeckCard[];
  extraDeck: DeckCard[];
  sideDeck: DeckCard[];
};