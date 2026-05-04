import { DeckViewer } from "../components/DeckViewer";
import { decks } from "../data/decks";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <DeckViewer decks={decks} />
    </main>
  );
}