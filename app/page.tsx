import { DeckViewer } from "../components/DeckViewer";
import { decks } from "../data/decks";
import { importedDecks } from "../data/importedDecks.generated";

export default function Home() {
  const visibleDecks = [...decks, ...importedDecks].filter(
    (deck) => deck.status !== "sample"
  );

  return <DeckViewer decks={visibleDecks} />;
}