import type { EnrichedDeckCard } from "../types/deck";

type DeckNotesProps = {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
};

type DeckNote = {
  title: string;
  description: string;
  severity: "warning" | "info";
};

function getAllCards({
  mainDeck,
  extraDeck,
  sideDeck,
}: {
  mainDeck: EnrichedDeckCard[];
  extraDeck: EnrichedDeckCard[];
  sideDeck: EnrichedDeckCard[];
}) {
  return [...mainDeck, ...extraDeck, ...sideDeck];
}

function getDeckNotes(cards: EnrichedDeckCard[]): DeckNote[] {
  const notes: DeckNote[] = [];

  const notInGameCards = cards.filter(
    (card) => card.gameSourceInfo?.status === "not-in-game"
  );

  const missingSourceCards = cards.filter((card) => !card.gameSourceInfo);

  if (notInGameCards.length > 0) {
    const totalCopies = notInGameCards.reduce(
      (total, card) => total + card.quantity,
      0
    );

    notes.push({
      title: `${totalCopies} card ${
        totalCopies === 1 ? "copy is" : "copies are"
      } not available in this game`,
      description: `Consider replacing: ${notInGameCards
        .map((card) => card.name)
        .join(", ")}.`,
      severity: "warning",
    });
  }

  if (missingSourceCards.length > 0) {
    const totalCopies = missingSourceCards.reduce(
      (total, card) => total + card.quantity,
      0
    );

    notes.push({
      title: `${totalCopies} card ${
        totalCopies === 1 ? "copy is" : "copies are"
      } missing source data`,
      description:
        "These cards may still be available, but their in-game pack source has not been mapped yet.",
      severity: "info",
    });
  }

  if (notes.length === 0) {
    notes.push({
      title: "No deck warnings",
      description:
        "Every card currently has an in-game source or an intentional status.",
      severity: "info",
    });
  }

  return notes;
}

function getNoteClassName(severity: DeckNote["severity"]) {
  if (severity === "warning") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  }

  return "border-blue-500/40 bg-blue-500/10 text-blue-100";
}

function getBadgeClassName(severity: DeckNote["severity"]) {
  if (severity === "warning") {
    return "bg-amber-500/20 text-amber-300";
  }

  return "bg-blue-500/20 text-blue-300";
}

export function DeckNotes({ mainDeck, extraDeck, sideDeck }: DeckNotesProps) {
  const allCards = getAllCards({ mainDeck, extraDeck, sideDeck });
  const notes = getDeckNotes(allCards);

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Deck notes</h3>
        <p className="mt-1 text-sm text-slate-400">
          Highlights important build issues for this game version.
        </p>
      </div>

      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.title}
            className={`rounded-2xl border p-4 ${getNoteClassName(
              note.severity
            )}`}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="font-semibold">{note.title}</p>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${getBadgeClassName(
                  note.severity
                )}`}
              >
                {note.severity}
              </span>
            </div>

            <p className="text-sm opacity-80">{note.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}