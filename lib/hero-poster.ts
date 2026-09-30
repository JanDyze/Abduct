// The poster that was just tapped (components/poster-hero.tsx), so a title page's loading skeleton
// can show it in the hero spot straight away: the poster grows into it, and the real page takes
// over in the same place.
export type TappedPoster = { src: string | null; name: string };

let tapped: TappedPoster | null = null;

export function setTappedPoster(p: TappedPoster | null) {
  tapped = p;
}

export function tappedPoster() {
  return tapped;
}
