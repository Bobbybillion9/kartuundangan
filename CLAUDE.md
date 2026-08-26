# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Kartu Undangan" (kartuundangan.link) is an Indonesian digital wedding-invitation service. All copy is in Bahasa Indonesia. There is no build system or package manager — every page is plain HTML with inline/linked CSS and JS, deployed as static files plus a couple of Vercel serverless functions. There is no automated test suite.

The project has grown past the original single-file landing page: it's now a small multi-page app backed by Supabase (Postgres + Auth + Storage).

## Working with this codebase

- No compilation step for any page — edit the HTML/CSS/JS directly and open it in a browser, or serve the directory with a static file server, to preview changes.
- No linter, formatter, or test command configured — verify changes visually in a browser at both mobile (`max-width:960px`) and desktop widths, and in both light and dark theme.
- The Supabase project is live/shared — treat schema migrations and RLS policy changes as production changes, not local experiments.

## Structure of the project

- **`index.html`** — the public marketing landing page (theme gallery, pricing, FAQ, etc. — see "Content notes" below). Also hosts the shared login/signup modal (markup here, logic in `assets/app.js`), since it's the only page that has one — see `assets/auth-core.js` below.
- **`app.html`** — the private dashboard, reached only by an authenticated user. It has a sidebar/tabbar with 5 views (Home, Desain Kamu, Template Tema, Harga, Profil) plus an in-page **workspace editor** for a single invitation, itself split into 5 tabs (Isi Data, Desain, Pratinjau, Bagikan, Tamu & Ucapan). All driven by `assets/dashboard.js`. `app.html` has no login form of its own: on load it checks the session and, if there isn't one, redirects the visitor to `index.html` with the login modal opened (`#masuk`) and remembers where to send them back via `sessionStorage['ku-pending-return']` (same pattern as `PENDING_TEMPLATE_KEY` in `assets/app.js`); a `SIGNED_OUT` event while on `app.html` sends the user to `index.html` (no modal).
- **`undangan.html`** — the public-facing invitation page guests open (`/u/:slug`, rewritten by `vercel.json` to `api/u/[slug].js`). Loads the invitation row by slug, then renders it into an `<iframe>` pointed at the matching theme template (`templates/.../index.html`) and injects the couple's data into it (`assets/render-undangan.js`). Also wires up the guest-facing RSVP, Ucapan, and Hadiah (gift/transfer-proof) forms found inside the template markup.
- **`templates/`** — one subfolder per visual theme, each a self-contained `index.html` + `style.css` (own inline script for demo/preview behavior, overridden at runtime by `assets/render-undangan.js`). Organized by category, currently only `elegan-klasik/` (`ivory-gold`, `sage-rose`, `emerald-dusk`). A `budaya/jawa-mandala-emas` theme existed as an experiment but was removed — it was never registered in `THEME_TEMPLATES`, so it never shipped. More categories can be added later. `templates/pratinjau.html` renders any one theme standalone (used by "Preview" links and the dashboard's live preview tab).
- **`api/`** — Vercel serverless functions. Currently just `api/u/[slug].js`, which special-cases link-preview bots (WhatsApp/Telegram/etc.) with server-rendered Open Graph meta tags for a given invitation, and otherwise passes through to the static `undangan.html`.
- **`assets/`** — shared JS/CSS:
  - `auth-core.js` — creates the single shared Supabase client, session state (`KU.getSession()` / `KU.isSessionResolved()`), the `ku:session`/`ku:authevent` events other scripts listen for, and the generic Yes/Cancel confirm modal. Loaded by every page that needs auth.
  - `app.js` — index.html-only: the login/signup/forgot-password/recovery modal, the account dropdown/drawer, and the landing-page theme/pricing grids.
  - `dashboard.js` — app.html-only: sidebar/tabbar navigation, the auth guard described above, the workspace editor, and dashboard-side RSVP/Ucapan/Hadiah admin views.
  - `render-undangan.js` — shared by `undangan.html` (public guest view) and `templates/pratinjau.html` (dashboard preview): populates a theme template iframe with invitation data and wires up its guest-facing forms.
  - `theme-templates.js` — `THEME_TEMPLATES`, the single catalog of available themes (id, name, category, thumbnail, description). Used by both the landing page's theme grid and the dashboard's Template Tema grid. Add new themes here.
  - `pricing-plans.js` — `PRICING_PLANS`, the single catalog of Satuan/Berlangganan packages (name, price, features). Used by both the landing page's Harga section and the dashboard's Harga tab.
  - `style.css` — shared design tokens and styles for `index.html`/`app.html` (spacing scale, radii, light/dark color tokens under `html[data-theme="..."]`, Fraunces/Inter fonts). Templates under `templates/` have their own separate `style.css` per theme.

## Backend (Supabase)

Project tables (all RLS-enabled):
- **`profiles`** — one row per `auth.users` id, extends it with `role`.
- **`invitations`** — the core row per wedding invitation: ownership (`user_id`), lifecycle (`status`: `draft`/`aktif`), the theme it uses (`kategori_desain`/`nama_desain`, matched against `THEME_TEMPLATES` — *not* a foreign key), the public `slug`, and all the couple/event/content fields (names, dates, location, opening/closing text, photos, bank account info for the gift card). Insert/select/update/delete policies are all "own rows only" (`auth.uid() = user_id`); a separate policy lets the public read a row by slug when `status = 'aktif'`.
- **`rsvp`**, **`ucapan`**, **`hadiah`** — guest-submitted-per-invitation tables (RSVP responses, well-wishes, and gift/transfer-proof records respectively). Same RLS shape throughout: public `insert` gated on the parent invitation being `status = 'aktif'`, `select`/`delete` restricted to the owning `authenticated` user only (`ucapan` additionally lets the public `select`, since well-wishes are meant to be shown to other guests — `rsvp` and `hadiah` do not, those stay private to the couple). None of these have an `update` policy, by design.
- **`templates`**, **`guests`**, **`payments`**, **`feedback`**, **`admin_requests`** — present in the schema but currently empty and not referenced by any application code. `templates`/`invitations.template_id` were superseded by the `THEME_TEMPLATES` JS catalog approach above and are dead weight (see project memory/chat history for the cleanup decision); the other four look like scaffolding for not-yet-built features (personalized guest links, billing, contact feedback, the "minta dibuatin admin" flow) rather than dead code — don't assume they're safe to drop without checking current status first.

Storage buckets:
- **`foto-undangan`** — public bucket for invitation photos (couple photos, gallery). Public because guests need to view them directly; path convention `[user_id]/[invitation_id]/...`, policies scoped to the authenticated owner for write/delete.
- **`bukti-transfer`** — private bucket for gift/transfer-proof photos uploaded by guests. Private because this content must stay visible only to the couple; path convention `[invitation_id]/[filename]` (no `user_id`, since anonymous guests uploading don't know it), matched against `invitations.user_id` via a subquery for the owner's read/delete policies. No `select`/`list` policy exists for anonymous guests, so a guest can upload but never see anyone's submission, including their own.

## Content notes

- `index.html`'s FAQ section's visible `<details>` content is duplicated in the `FAQPage` JSON-LD block in its `<head>` for SEO. If you edit FAQ questions/answers, update both places to keep them in sync.
- WhatsApp links (`https://wa.me/62xxxxxxxxxx`) are still placeholders across the site — treat them as content to fill in, not evidence of a wired-up number.
- Pricing/feature copy is centralized in `assets/pricing-plans.js` (`PRICING_PLANS`) — when changing prices or features, that's the one place to edit; check for any hardcoded restatements elsewhere (hero note, FAQ answers, meta description) that might drift out of sync.
