# Abduct

Lists of movies, series and anime you want to watch, and a UFO that picks one when you can't decide.

## What's in it

- **Home**: the UFO with *Pick for me* and *Add* side by side, Settings in the card's corner, then tonight's pick (once you've said yes to one), Discover, your lists, and what you added last.
- **Pick for me** (`/spin`): the randomizer. Narrow it down by list, kind (movies, series, anime), time (*Under 2 hours*, *Something quick*: a series or anime fits when one episode does), genre, and whether rewatches count. Posters flick past in the beam and one is lowered out of it.
  - *We're watching this* keeps it as tonight's pick on Home. *Nope, again* rules it out until you leave the page. *Seen it* marks it watched and spins again.
  - The pick is weighted, not flat: a title that's waited on a list for months gets up to twice the chance, and one the UFO offered recently gets a quarter, so spinning again doesn't keep landing on the same few (`lib/randomizer/pick.ts`).
  - Filters are remembered on the device.
- **Lists** (`/lists`): everyone starts with a Watchlist as their default list: anything added without choosing a list lands there, to sort later from the title's page. Any list can be made the default from its edit page (the default can't be deleted). *Arrange* puts your lists, and the titles still to watch on a list, in your own order by dragging. Make more ("Date night", "Anime backlog"), each with an icon and a color to tell them apart (the icon takes the list's color). A list shows what's left to watch or what's been watched, by kind, with your stars under what you've rated, and can be the only list the UFO picks from.
- **Add a title** (`/add`): search movies and series ([TMDB](https://www.themoviedb.org)) and anime ([AniList](https://anilist.co)) together or by kind, and add with one tap. Anything they don't have can be added by hand.
- **Discover** (`/discover`): new and trending titles from TMDB and AniList (one tap adds to your default list), *Most liked on Abduct* (everyone's stars, ranked so one five-star vote doesn't beat many fours), and popular and newly shared public lists.
- **Public lists** (`/discover/lists/<id>`): make a list public from its edit page and anyone signed in can see what's on it (never what you've watched), like it, and open its titles. A title from Discover or a public list opens at `/titles/<id>` with everyone's average rating, public comments, and *Add to* your default list.
- **A title** (`/items/<id>`): poster, backdrop, what it is, score, genres and story; mark it watched, rate it 1 to 5 stars, put it on your other lists or take it off (sorting something added in a hurry), keep a thread of dated comments on it (each for everyone, with your name from Settings, or only you) and read what others said, or take it off the list. Ratings and comments belong to the title, not the list, so they stay if it moves or comes off a list.

What comes next is in [ROADMAP.md](ROADMAP.md).

Next.js (App Router) · Supabase (Postgres + Auth) · Drizzle · Tailwind + shadcn/ui · TMDB + AniList · Vercel

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. **Google sign-in**: in Google Cloud Console, create an OAuth client (Web application) with the redirect URI shown under **Authentication → Sign In / Providers → Google** in Supabase (`https://<project>.supabase.co/auth/v1/callback`), publish the consent screen, then paste its Client ID and secret into that Supabase panel and enable it.
3. **Authentication → Sign In / Providers → Email**: turn "Enable email provider" **off** (there's no email/password form).
4. **Guests** (optional): turn on **Allow anonymous sign-ins** to show *Continue as guest*, and **Allow manual linking** so a guest can save their account with Google later.
5. **Authentication → URL Configuration**: set the Site URL to where Abduct runs, and add each address you open it from to **Redirect URLs** (e.g. `http://localhost:3000/**`, `http://192.168.1.10:3000/**`, your production domain). Sign-in returns through `/auth/confirm`.

### 2. TMDB (movies and series)

Make a free account at [themoviedb.org](https://www.themoviedb.org), then **Settings → API** and copy the **API Read Access Token** (the long one). Without it, search finds anime only, and movies and series are added by hand. AniList needs no key.

### 3. Environment

```sh
cp .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → Publishable key |
| `DATABASE_URL` | Connect → Transaction pooler (port 6543) |
| `DIRECT_URL` | Connect → Session pooler (port 5432) |
| `TMDB_READ_TOKEN` | themoviedb.org → Settings → API → API Read Access Token |
| `CRON_SECRET` | Any long random string |
| `SITE_URL` | Production only: the address Abduct is reached at, e.g. `https://abduct.example.com` |

Generate random strings with `node -e "console.log(crypto.randomBytes(32).toString('base64url'))"`.

### 4. Database

```sh
npm run db:migrate
```

This creates the `titles`, `lists`, `list_items`, `picks`, `ratings`, `comments`, `profiles` and `list_likes` tables with row level security on and no policies. The app reaches them through Drizzle, and Supabase's public API can't.

### 5. Run

```sh
npm run dev
```

Open http://localhost:3000 and sign in.

## Install as an app (PWA)

Abduct installs to a phone's home screen and opens in its own window (`app/manifest.ts`, icons in `public/icons/`), with shortcuts to *Pick for me*, *Add a title* and *My lists* on a long press.

- **Android (Chrome):** open Abduct over **HTTPS** (e.g. once it's deployed) → menu → *Install app*. For a local test use `next dev --experimental-https`.
- **iPhone (Safari):** Share → *Add to Home Screen*.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:generate` | Create a migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the database |
| `npm test` | Unit tests for the randomizer, catalog mapping and formatting (Vitest) |

## How titles are kept

A movie, series or anime is saved once in `titles` (one row per catalog + id) and shared: the first person to add it saves its details and everyone after reuses them. Details always come from the catalog on the server (`lib/titles/save.ts`), never from what a browser sends, and are refreshed when someone adds a title again after 30 days. Titles added by hand belong to whoever typed them in.

## Deploy (Vercel)

1. Push to a **private** GitHub repo and import it in Vercel.
2. Add the same environment variables in Vercel → Settings → Environment Variables.
3. `vercel.json` schedules `/api/cron/keepalive` daily so the free Supabase project isn't paused.

## Access rules

- Every page needs a session except `/login`, `/auth/*` and `/api/cron/*`.
- `proxy.ts` redirects signed-out visitors early. Pages and server actions check again with `requireUser()` from `lib/auth.ts`, and every query on lists filters by that user's id.
- `/api/cron/*` requires `Authorization: Bearer $CRON_SECRET`.

## Brand

`brand/` holds the logo: the original PNG, the vector SVGs (the mark alone, with the wordmark, each with an intro animation, and the ship levelled out without its beam for Home and the randomizer) and `gen.py`, which rebuilds them from the traced paths. `public/` serves the copies the app uses.

List icons come from `brand/Abduct Icons.png`: `brand/trace_icons.py` traces the 48 icons (labels dropped) into one sprite, `public/list-icons.svg`. Each icon has two layers: cream (`--icon-base`) and the accent (`--icon-accent`), which `components/list-icon.tsx` sets to the list's color.
