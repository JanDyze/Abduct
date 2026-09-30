# Roadmap

Planned, not built yet.

## Deciding together

The reason Abduct exists: two or more people who can't agree.

- **Shared lists**: public lists are built (0.4.0: anyone can see and like them). Next, invite someone to *edit* a list, so a couple's "Date night" is one list both of you add to. Needs a `list_members` table and every list query to allow members, not just the owner.
- **Follow people**: see the lists and comments of people you follow first in Discover.
- **Veto round**: the UFO offers three, each person strikes one, the one left wins. Or everyone gets one "Nope" per night.
- **Spin together**: both phones show the same spin (same seed, `lib/randomizer/pick.ts` already takes an `rng`).

## Smarter picks

- **Where to watch**: TMDB's watch providers per country, so the pick says "On Netflix" and the randomizer can filter to services you have.
- **Mood**: a filter that maps to genres ("Something light", "Edge of my seat", "Cry a bit").
- **Series progress**: which episode you're on, so a half-watched series can come up as "Continue".

## Getting titles in

- Import from Letterboxd (CSV), MyAnimeList and AniList (by username), and TMDB watchlists.
- Share to Abduct from another app (Web Share Target), e.g. a trailer link.

## App

- Service worker with an offline page, like Kept's (`public/sw.js`).
- Reorder lists and titles (the `position` column is there for lists).
- Search within a list.
