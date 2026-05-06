# Yu-Gi-Oh Meta Decks

A simple web app for viewing historical Yu-Gi-Oh meta decks and checking how practical they are to build in **Yu-Gi-Oh! Legacy of the Duelist**.

The app supports:

- Historical decklists
- Switch-compatible deck variants
- Card previews
- Card images and details from the YGOPRODeck API
- In-game pack/source data from a generated Steam guide import
- Manual source corrections and overrides
- Deck validation
- Pack summaries
- Missing source checks
- Replacement suggestions for unavailable cards
- Name-based decklist importing
- Inline and automatic card tagging for imported decklists
- Deck source metadata

## Live app

The app is deployed through Vercel.

## Local development

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build check

Before pushing larger changes, run:

```bash
npm run build
```

This checks whether the app can compile successfully.

## Data sources

### Card details and images

Card details, images, types, attributes, levels, and descriptions are loaded from the YGOPRODeck API.

Manual card detail data can still exist as fallback data, but the goal is to rely mostly on the API.

### In-game pack sources

In-game pack source data is generated from the Steam community guide for **Yu-Gi-Oh! Legacy of the Duelist**.

The generated file is:

```text
data/cardGameSources.generated.ts
```

Manual corrections and special statuses are stored in:

```text
data/cardGameSources.ts
```

Manual data has priority over generated data. This means we can use generated data broadly, while still correcting specific cards when needed.

## Updating in-game pack source data

Run the importer:

```bash
node scripts/importPackSources.mjs
```

This fetches the Steam guide, parses pack/card data, and updates:

```text
data/cardGameSources.generated.ts
data/cardGameSources.importReport.json
```

It also creates a local debug file:

```text
data/legacyOfDuelistGuideRaw.txt
```

That raw debug file is ignored by Git and should not be committed.

## Pack source import report

After running the pack source importer, check the terminal output. It should show something like:

```text
Import report
-------------
Generated unique cards: 6770
Detected packs: 26
Detected categories: 12
Cards with multiple sources: 9
```

The full report is saved here:

```text
data/cardGameSources.importReport.json
```

Use this report to quickly check whether the Steam guide import still looks healthy.

## Recommended pack source update workflow

Run:

```bash
node scripts/importPackSources.mjs
```

Then check the app build:

```bash
npm run build
```

Then commit and push:

```bash
git status
git add .
git commit -m "Update generated pack sources"
git push
```

## Importing decklists

Name-based decklists can be imported from:

```text
data/deckImportRaw.txt
```

The importer generates:

```text
data/importedDecks.generated.ts
data/importedDecks.importReport.json
```

Imported decks are automatically shown in the app sidebar.

### Deck import format

Use this format:

```text
Deck: Example Goat Deck
Year: 2005
Format: Goat Format
Status: draft
Source: Top 8 Local Championship 2005
Player: Example Player
Deck Type: Goat Control
Source URL: https://example.com/deck-source
Source Notes: Optional notes about the decklist source.

Main Deck
1 Black Luster Soldier - Envoy of the Beginning
1 Airknight Parshath
2 Magician of Faith
3 Scapegoat

Extra Deck
3 Thousand-Eyes Restrict

Side Deck
2 Dust Tornado
1 Mobius the Frost Monarch
```

Supported statuses:

```text
complete
sample
draft
```

### Deck source metadata

Deck source metadata is optional, but recommended for real imported historical decks.

Supported metadata fields:

```text
Source: Top 16 YCS Turin 2013
Player: Michele Bergamasco
Deck Type: Dragon Ruler
Source URL: https://example.com/source-page
Source Notes: Optional notes about source reliability or context.
```

These fields generate a `source` object in the deck data and display a **Deck source** block in the app.

Example:

```text
Deck: Dragon Ruler YCS Turin 2013
Year: 2013
Format: TCG Advanced
Status: complete
Source: Top 16 YCS Turin 2013
Player: Michele Bergamasco
Deck Type: Dragon Ruler
Source URL: https://yugiohtcgzone.blogspot.com/2013/12/dragon-ruler-by-michele-bergamasco-top.html
```

### Importing multiple decks

Separate multiple decklists with:

```text
---
```

Example:

```text
Deck: First Deck
Year: 2005
Format: Goat Format
Status: draft

Main Deck
1 Card A
1 Card B

---

Deck: Second Deck
Year: 2013
Format: TCG Advanced
Status: draft

Main Deck
1 Card C
1 Card D
```

### Inline tags

You can optionally add tags directly after a card name using `|`.

Example:

```text
1 Pot of Greed | draw
2 Book of Moon | disruption, quick-play
1 Jinzo | tribute, trap control
```

The importer will generate:

```ts
{
  name: "Book of Moon",
  quantity: 2,
  tags: ["disruption", "quick-play"],
}
```

### Automatic tags

The deck importer also applies automatic tags from:

```text
data/cardTagRules.ts
```

For example, if `data/cardTagRules.ts` contains:

```ts
export const cardTagRules: Record<string, string[]> = {
  "Pot of Greed": ["draw", "power spell"],
  "Book of Moon": ["disruption", "quick-play", "flip support"],
};
```

Then this deck import line:

```text
1 Pot of Greed
```

automatically receives:

```ts
tags: ["draw", "power spell"]
```

Inline tags and automatic tags are merged. For example:

```text
1 Pot of Greed | staple
```

generates tags like:

```text
draw
power spell
staple
```

### Duplicate deck IDs

Deck IDs are generated from deck names.

For example:

```text
Deck: Goat Control
```

generates:

```text
goat-control
```

If multiple imported decks have the same name, the importer automatically renames later IDs:

```text
goat-control
goat-control-2
goat-control-3
```

The import report will mention any automatically renamed duplicate IDs.

### Running the deck importer

Run:

```bash
node scripts/importDecklist.mjs
```

The terminal will show a report like:

```text
Deck import report
------------------
Imported decks: 1
Total warnings: 0
Automatic tag rules: 75

1. Dragon Ruler YCS Turin 2013
   ID: dragon-ruler-ycs-turin-2013
   Year: 2013
   Format: TCG Advanced
   Status: complete
   Source: Top 16 YCS Turin 2013
   Player: Michele Bergamasco
   Deck Type: Dragon Ruler
   Main Deck: 41 cards
   Extra Deck: 15 cards
   Side Deck: 15 cards
   Total: 71 cards
   Tagged cards: 34
   Automatic tagged cards: 34
```

Warnings are expected for incomplete sample decks in local validation data. Real completed decks should usually have fewer warnings.

### Recommended deck import workflow

Edit:

```text
data/deckImportRaw.txt
```

Then run:

```bash
node scripts/importDecklist.mjs
```

Check the import report. Then run:

```bash
npm run build
```

Then commit and push:

```bash
git status
git add .
git commit -m "Import decklists"
git push
```

## Deck visibility

Decks can have one of three statuses:

```text
complete
sample
draft
```

The app sidebar shows complete and draft decks. Sample decks remain available in the data for local validation and future imports, but they are not exposed in the app UI.

## Deck variants

Deck variants are stored in:

```text
data/deckVariants.ts
```

These allow the app to support both:

- Historical decklists
- Game-compatible versions

For example, Goat Control can keep the historical version while also offering a Switch-compatible version that replaces unavailable cards.

## Manual replacement suggestions

Replacement suggestions are stored in:

```text
data/cardReplacements.ts
```

These are curated manually because replacement quality is a product decision, not something that should be guessed automatically.

## Important development note

Generated and API data should reduce manual work as much as possible.

Manual files should mainly be used for:

- Corrections
- Not-in-game statuses
- Replacement suggestions
- Deck variants
- Curated decklists
