# Initial Setup

## SvelteKit Project Scaffolding

Project was created using `npx sv create` with the following options:

- **Template:** SvelteKit minimal
- **Language:** JavaScript (with JSDoc type checking via `jsconfig.json`)
- **Svelte version:** Svelte 5 (runes mode enabled)
- **Adapter:** `@sveltejs/adapter-static` (static site generation)
- **Bundler:** Vite 7
- **Linting/Formatting:** ESLint + Prettier (with `prettier-plugin-svelte` and `prettier-plugin-tailwindcss`)
- **CSS:** Tailwind CSS v4 (via `@tailwindcss/vite` plugin)

## Path Aliases

This scaffold passes SvelteKit's config inline to the `sveltekit()` plugin in `vite.config.js` rather than keeping a `svelte.config.js` (supported since SvelteKit 2.62 — if both exist, the file is ignored with a warning). Kit options are flattened, so aliases go under `alias` alongside `adapter`:

| Alias         | Path                 |
| ------------- | -------------------- |
| `$lib`        | `src/lib` (built-in) |
| `$assets`     | `src/lib/assets`     |
| `$utils`      | `src/lib/utils`      |
| `$components` | `src/lib/components` |

## Folder Structure

```
src/
├── lib/
│   ├── assets/
│   │   ├── data/                   # Cleaned CSVs — only if the project has a dataset
│   │   ├── fonts/                  # Only if the project ships a custom typeface
│   │   └── favicon.svg
│   ├── components/
│   ├── styles/
│   │   ├── app.css
│   │   └── variables.css
│   └── utils/
└── routes/
    ├── +layout.js                  # export const prerender = true (required by adapter-static)
    ├── +layout.svelte
    └── +page.svelte
```

`+layout.js` is not optional: `adapter-static` fails the build with "Encountered dynamic routes" unless every route is prerenderable.

**Create a directory when something goes in it — no `.gitkeep` placeholders.** `assets/data/` and `assets/fonts/` are the two that often never get used: the first only for projects with a dataset, the second only when a custom typeface replaces the default. An empty directory pinned open by a placeholder file reads as "this is expected to be here and is missing", which is the opposite of what is true.

## Styles

### `src/lib/styles/app.css`

- Imports Tailwind CSS and `variables.css`
- Scopes Tailwind's class scanning to `src/` with `@import 'tailwindcss' source('../../')`. Automatic detection otherwise starts at the repo root, so utility names written in prose — the token table in this file, for instance — get compiled into the production bundle.
- CSS resets: `box-sizing: border-box`, zero margin/padding, font smoothing
- Sets the base font on `body` from the `--font-sans` token
- Media elements (`img`, `picture`, `video`, `svg`) set to `display: block` and `max-width: 100%`
- `.placeholder` utility class — creates a placeholder block element with a light grey background

### `src/lib/styles/variables.css`

- Typeface: **Helvetica**, as a web-safe system font — nothing downloaded, no `@font-face`, no font dependency. `--font-sans` is set to `"Helvetica Neue", Helvetica, Arial, sans-serif`: macOS and iOS resolve Helvetica Neue, Windows falls back to Arial (metric-compatible, so measure and line breaks hold), and `sans-serif` catches everything else. Because nothing is fetched at runtime there is no FOUT to manage and no `font-display` to tune.
- **Helvetica is the placeholder default — swap it for whatever the project actually calls for.** To do that: create `src/lib/assets/fonts/`, drop the font files in, add one `@font-face` declaration per weight (each with `font-display: swap`), and point `--font-sans` at the new family name. Nothing downstream needs touching — `app.css` and the Tailwind `font-sans` utility both read the token, not the family.
- The font family is registered as `--font-sans` inside `@theme`, so it is reachable as `var(--font-sans)` and as Tailwind's `font-sans` utility.
- Tokens are declared in **`@theme static`**, not plain `@theme`. Plain `@theme` emits only the variables some generated utility actually uses, so a token referenced solely as `var(--color-locked)` in a component's `<style>` block resolves to nothing. `static` emits all of them to `:root`.
- Color tokens registered via Tailwind v4 `@theme` directive (usable as both CSS variables and Tailwind utilities like `bg-primary`, `text-secondary`, etc.):

| Token                 | Value     | Tailwind class example |
| --------------------- | --------- | ---------------------- |
| `--color-primary`     | `#FC341E` | `bg-primary`           |
| `--color-primary-400` | `#FC5543` | `bg-primary-400`       |
| `--color-primary-300` | `#FC6B5B` | `bg-primary-300`       |
| `--color-primary-250` | `#FC7667` | `bg-primary-250`       |
| `--color-primary-200` | `#FC8073` | `bg-primary-200`       |
| `--color-primary-150` | `#FC968A` | `bg-primary-150`       |
| `--color-primary-100` | `#FDB7AF` | `bg-primary-100`       |
| `--color-secondary`   | `#FFBE00` | `bg-secondary`         |
| `--color-locked`      | `#141414` | `bg-locked`            |
| `--color-dark-bg`     | `#1E1E1E` | `bg-dark-bg`           |

- Gradients can be composed inline with Tailwind: `bg-linear-to-r from-primary to-primary-100`

### Layout

`+layout.svelte` imports `$lib/styles/app.css` globally and sets the favicon.

## Prettier Configuration

Update `tailwindStylesheet` in `prettier.config.js` to point to your actual CSS entrypoint (`./src/lib/styles/app.css`) — an incorrect path silently breaks class sorting on save.

In `.vscode/settings.json`, set the default formatter for Svelte files to `esbenp.prettier-vscode` (not `svelte.svelte-vscode`) — the Svelte extension uses its own bundled prettier which ignores project plugins:

```json
"[svelte]": {
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Key Packages

| Package                     | Version | Purpose                                                                  |
| --------------------------- | ------- | ------------------------------------------------------------------------ |
| `d3`                        | 7.9.0   | Data visualization and DOM manipulation                                  |
| `gsap`                      | 3.14.2  | Animation library for scroll-driven and timeline animations              |
| `@sveltejs/svelte-scroller` | 2.0.7   | Scroll-based storytelling component for SvelteKit                        |
| `@lucide/svelte`            | 0.544.0 | Icon library for Svelte (pinned — v0.577+ has SSR issues with SvelteKit) |

## Data Preparation

**Before setting any of this up, ask whether the project actually has a dataset.** Plenty of projects are copy-, illustration- or animation-led, or carry a handful of numbers that live fine as a literal in a component. For those, skip this section entirely — no `data-prep/` directory, no `src/lib/assets/data/`, no Python dependency.

Scaffold the pipeline when the answer is a **traditional dataset**: a spreadsheet or CSV export, rows and columns, arriving from a client, Sheets or a public source, and likely to be re-sent in a revised version later. That last part is what the pipeline buys — a re-runnable cleaning step instead of a hand-edited file nobody can reproduce.

Skip it when the data is a handful of hardcoded values, comes from an API at runtime, or is already clean and small enough to drop straight into `src/lib/assets/data/`.

Everything below assumes the answer was yes.

### Directory Structure

```
data-prep/
├── data/
│   └── source-export.csv      # Raw source, exactly as received (Sheets/Figma/client)
├── scripts/
│   ├── data-prep.py           # Cleaning and transformation script
│   └── test-data-prep.py      # Validation tests for output
└── outputs/
    └── <source-dataset>-data.csv   # Cleaned output (also copied to src/lib/assets/data/)
```

Conventions:

- **Never hand-edit the raw file in `data/`.** Every change is code in `data-prep.py`, so the pipeline can be re-run unchanged when a new export arrives.
- Name the output after the source dataset, not after the client or the chart — a dataset often feeds more than one chart, and charts get renamed.
- Write the output to both `data-prep/outputs/` and `src/lib/assets/data/`, so the app imports a file the pipeline owns.

### Pipeline

Run from the project root:

```bash
python data-prep/scripts/data-prep.py
python data-prep/scripts/test-data-prep.py
```

### `data-prep.py` — Transformations

The first two apply to essentially every spreadsheet export; the next two are common enough to reach for by default. Project-specific steps slot in after them.

1. **Trim whitespace** — strips leading/trailing spaces from all string entries
2. **Remove empty rows** — drops rows where all fields are blank
3. **Remove non-data rows** — exports often carry section markers or repeated headers as ordinary rows; drop them by matching the marker pattern in the column it appears in
4. **Forward-fill grouped columns** — a column labelled only on the first row of a visual group reads as blank for the rest once exported; `df[col].ffill()` copies the last non-blank value down so every row is self-describing

**The catch with forward-fill:** `ffill()` cannot tell "blank because it continues the group above" from "blank because the value is genuinely missing" — it fills both, and the second case gets a confidently wrong value. Hence the provenance check below: asserting no blanks remain only proves `ffill()` ran, not that the values are right.

### `test-data-prep.py` — Validation Tests

The organising principle: **every transformation gets a test asserting it happened, and every column you did _not_ transform gets a test asserting it did not change.** The second half is what catches accidental damage — a stray reindex or dtype coercion that silently rewrites a column nobody was looking at.

| Class           | Check                                                                   | When          |
| --------------- | ----------------------------------------------------------------------- | ------------- |
| Schema          | Expected columns present, in the expected order                         | Always        |
| Cleanliness     | No fully-blank rows; no leading/trailing whitespace in any string value | Always        |
| Structural      | Non-data marker rows are gone                                           | If step 3 ran |
| Completeness    | Forward-filled columns contain no blanks                                | If step 4 ran |
| Domain validity | Each categorical column contains only its allowed set of values         | Per project   |
| Provenance      | Untouched columns match the raw input cell-for-cell (after trim)        | Always        |
| Provenance      | Each filled value matches the first raw value of its group              | If step 4 ran |
| Sanity          | Row count is > 0 and within the expected range for this source          | Always        |

Domain validity and provenance are the two that need per-project work: list the allowed values for each categorical column, and list which columns the script is expected to leave alone.
