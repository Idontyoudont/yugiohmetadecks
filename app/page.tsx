import { DeckViewer } from "../components/DeckViewer";
import { decks } from "../data/decks";
import { curatedDeckIdSet } from "../data/curatedDeckIds.generated";
import { importedDecks } from "../data/importedDecks.generated";

export default function Home() {
  const curatedImportedDecks = importedDecks.filter((deck) =>
    curatedDeckIdSet.has(deck.id)
  );

  return <DeckViewer decks={[...decks, ...curatedImportedDecks]} />;
}