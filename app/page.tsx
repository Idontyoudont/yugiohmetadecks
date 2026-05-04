import { DeckViewer } from "../components/DeckViewer";
import { decks } from "../data/decks";
import { importedDecks } from "../data/importedDecks.generated";

export default function Home() {
  return <DeckViewer decks={[...decks, ...importedDecks]} />;
}