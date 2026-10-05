// The movie player: an embeddable page that plays a movie by its TMDB id. Its address lives in
// MOVIE_PLAYER_URL (server only, never sent to the browser): pages point the player at
// app/api/play, which sends you on from there. Only TMDB movies can play (that includes anime
// movies found through TMDB); series, AniList anime and titles typed in by hand can't.

export const playerEnabled = () => Boolean(process.env.MOVIE_PLAYER_URL?.includes("{id}"));

// The TMDB id the player plays a title by, or null when it can't play it.
export function playableMovieId(source: string, sourceId: string): string | null {
  if (source !== "tmdb") return null;
  return /^movie:(\d+)$/.exec(sourceId)?.[1] ?? null;
}

// Where the player for a TMDB movie id is. Null when the player isn't set up.
export function playerUrl(movieId: string): string | null {
  const template = process.env.MOVIE_PLAYER_URL;
  if (!template?.includes("{id}") || !/^\d+$/.test(movieId)) return null;
  return template.replace("{id}", movieId);
}
