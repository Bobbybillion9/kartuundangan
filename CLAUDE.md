# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single self-contained static HTML landing page (`index.html`) for "Kartu Undangan" (kartuundangan.link), an Indonesian digital wedding-invitation service. All copy is in Bahasa Indonesia. There is no backend, no build system, no package manager, and no test suite — the entire site is one file with inline `<style>` and `<script>`.

## Working with this codebase

- Edit `index.html` directly; there is no compilation step. Open the file in a browser (or serve the directory with any static file server) to preview changes.
- There is no linter, formatter, or test command configured — verify changes by visually checking the page in a browser at both mobile (`max-width:960px` breakpoint) and desktop widths, and in both light and dark theme.
- Keep everything self-contained in `index.html` (styles/script inline) unless the user asks to split the project into multiple files.

## Structure of index.html

The page is built from CSS custom properties (design tokens) declared once and consumed everywhere:
- `:root` — spacing scale (`--s1`…`--s7`), radii (`--r-sm/md/lg/full`)
- `html[data-theme="light"]` / `html[data-theme="dark"]` — color tokens (`--paper`, `--card`, `--ink*`, `--accent*`, `--line*`, `--shadow`). Theme is applied via `data-theme` on `<html>`, toggled by the button in the header, and persisted to `localStorage` under the key `ku-theme` (falls back to `prefers-color-scheme` on first visit). When adding new UI, use existing tokens rather than hardcoded colors so both themes stay correct.
- Fonts: Fraunces (serif, used for headings/`.script` accents) and Inter (body), loaded from Google Fonts.

Sections run top to bottom in one flow (all in `index.html`, referenced by `id` from the nav/footer):
`header`/mobile `.drawer` → `.hero` → `#tema` (theme gallery) → `#cara-kerja` (3-step process) → `#keunggulan` (feature highlights) → `#dibuatin-admin` (DIY vs. done-for-you paths) → `#harga` (pricing — has a JS-driven toggle between one-time "Satuan" packages and "Berlangganan" subscription packages, showing/hiding `#planSatuan`/`#planSubs`) → `#reseller` (WO/reseller pitch) → `#faq` (native `<details>` accordion) → `#daftar` (final CTA) → `footer` → floating WhatsApp button + mobile sticky CTA bar.

The inline `<script>` (bottom of file, single IIFE) handles: theme toggle + persistence, mobile drawer open/close, pricing satuan/subscription toggle, and the scroll-triggered mobile sticky CTA. It has no external dependencies.

## Content notes

- The FAQ section's visible `<details>` content is duplicated in the `FAQPage` JSON-LD block in `<head>` for SEO. If you edit FAQ questions/answers, update both places to keep them in sync.
- WhatsApp links and the "Masuk"/"Daftar" auth links are currently placeholders (`https://wa.me/62xxxxxxxxxx`, `#daftar`, `#masuk`) with no real backend wired up — treat them as content to fill in, not evidence of existing functionality.
- Pricing, feature lists, and package names (Standar/Pro/Premium; Satuan/Berlangganan tiers) are marketing copy — when changing prices or features, check both the `#harga` cards and any references elsewhere on the page (e.g. hero note, FAQ answers, meta description) that restate the same numbers.
