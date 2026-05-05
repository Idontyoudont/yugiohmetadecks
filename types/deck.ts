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

export type BanlistStatus = "forbidden" | "limited" | "semi-limited";

export type BanlistInfo = {
  name: string;
  status: BanlistStatus;
  label: string;
  allowedCopies: 0 | 1 | 2;
  listName: string;
  effectiveDate: string;
  sourceUrl: string;
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
    banlistInfo?: BanlistInfo;
  };

export type DeckStatus = "complete" | "sample" | "draft";

export type DeckSource = {
  label: string;
  player?: string;
  deckType?: string;
  url?: string;
  notes?: string;
};

export type Deck = {
  id: string;
  name: string;
  year: number;
  format: string;
  status: DeckStatus;
  source?: DeckSource;
  mainDeck: DeckCard[];
  extraDeck: DeckCard[];
  sideDeck: DeckCard[];
};

export type DeckCardReplacement = {
  from: string;
  to: DeckCard;
  reason: string;
};

export type DeckVariant = {
  id: string;
  deckId: string;
  name: string;
  description: string;
  replacements: DeckCardReplacement[];
};