// Streaming services by a key that doesn't care how a catalog spells them ("Netflix Standard with
// Ads" and "Netflix" are both Netflix; "Disney Plus" and "Disney+" are one), for matching what's on
// offer against the services you have (Settings), and links that open a title's search right in a
// service's app or site. Shared by server and phone.

const ALIASES: [RegExp, string][] = [
  [/^netflix/, "netflix"],
  [/^(amazon ?)?prime ?video|^amazon ?video/, "primevideo"],
  [/^disney/, "disneyplus"],
  [/^(hbo ?)?max\b/, "max"],
  [/^hulu/, "hulu"],
  [/^apple ?tv/, "appletv"],
  [/^paramount/, "paramountplus"],
  [/^peacock/, "peacock"],
  [/^crunchyroll/, "crunchyroll"],
  [/^youtube/, "youtube"],
  [/^google play/, "googleplay"],
  [/^tubi/, "tubi"],
  [/^pluto/, "plutotv"],
  [/^plex/, "plex"],
];

export function serviceKey(name: string) {
  const n = name
    .toLowerCase()
    .replace(/\+/g, " plus")
    .replace(/\b(standard|basic|premium)?\s*with ads\b|\bamazon channel\b|\bapple tv channel\b/g, "")
    .trim();
  return ALIASES.find(([re]) => re.test(n))?.[1] ?? n.replace(/[^a-z0-9]/g, "");
}

// Searches that open in the service's app on a phone (they're the links the apps claim). Only
// services whose search address is stable; anything else keeps the catalog's own link.
const SEARCH: Record<string, (q: string) => string> = {
  netflix: (q) => `https://www.netflix.com/search?q=${q}`,
  primevideo: (q) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`,
  disneyplus: (q) => `https://www.disneyplus.com/search?q=${q}`,
  hulu: (q) => `https://www.hulu.com/search?q=${q}`,
  appletv: (q) => `https://tv.apple.com/search?term=${q}`,
  crunchyroll: (q) => `https://www.crunchyroll.com/search?q=${q}`,
  youtube: (q) => `https://www.youtube.com/results?search_query=${q}`,
  googleplay: (q) => `https://play.google.com/store/search?q=${q}&c=movies`,
  tubi: (q) => `https://tubitv.com/search/${q}`,
};

export function serviceLink(name: string, title: string, fallback: string) {
  const search = SEARCH[serviceKey(name)];
  return search ? search(encodeURIComponent(title)) : fallback;
}
