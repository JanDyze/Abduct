// Guessing which movie or show a shared reel is about, from its caption and whatever text came
// with the share. Captions name titles in a few common ways; the most telling go first:
//   "The Shawshank Redemption"          in quotes
//   Movie: Project Hail Mary            after a label (movie, film, series, show, anime, title, 🎬)
//   Oldboy (2003)                       followed by a year
//   #TheDarkKnight  #interstellar       as a hashtag (not the generic ones like #fyp or #movie)
// and, failing those, the caption's first line: its first part when it's split up the way trailer
// and clip titles are ("Interstellar - Official Trailer | Warner Bros."), then the whole line.

// Hashtags and words that say "this is a movie clip", not which one.
const GENERIC = new Set(
  (
    "fyp foryou foryoupage fy fypage viral trending trend explore explorepage reels reel shorts short tiktok fb facebook instagram ig youtube " +
    "movie movies film films filmtok movietok moviescene moviescenes movieclip movieclips moviereview movierecommendation movierecommendations " +
    "moviestowatch moviestime movienight cinema cinematic scene scenes clip clips edit edits edited capcut trailer teaser series tv tvshow tvseries " +
    "show shows episode anime animeedit animes kdrama cdrama drama dramas netflix netflixseries primevideo prime disney disneyplus hbo hbomax max hulu " +
    "appletv crunchyroll recommendation recommendations mustwatch watch watching watchthis pov part1 part2 part3 fyppp fypシ xyzbca foru 4u " +
    "horror comedy romance action thriller scifi fantasy mystery crime documentary animation family adventure war western musical"
  ).split(" "),
);

const URL_RE = /https?:\/\/\S+/g;
// What trailer and clip titles add around the name.
const NOISE = /[([]?\b(?:official|final|teaser|trailer|clip|scene|full movie|hd|4k|uhd|#?\d)\b(?:\s+(?:trailer|teaser|clip|#?\d+))*[)\]]?/gi;
const clean = (s: string) =>
  s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ") // emoji
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—:|•,.!?]+|[\s\-–—:|•,.!?]+$/g, "");

// #TheDarkKnight → The Dark Knight, #spider_man → spider man, #interstellar stays.
function fromHashtag(tag: string) {
  return tag
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d{2,})/g, "$1 $2")
    .trim();
}

// Where a spoken title ends: its run of capitalised words ("The Lord of the Rings" keeps "of the"
// because a capitalised word follows), stopping where the sentence goes on ("Oldboy changed Korean
// cinema" is "Oldboy"). Said all in lowercase, its first few words.
function titleRun(s: string) {
  const words = s.trim().split(/\s+/);
  if (!/^[A-Z0-9]/.test(words[0] ?? "")) return words.slice(0, 4).join(" ");
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const joiner = /^(?:of|the|and|a|an|in|on|to|for|vs\.?|&)$/i.test(w) && /^[A-Z0-9]/.test(words[i + 1] ?? "");
    if (i === 0 || /^[A-Z0-9]/.test(w) || joiner) out.push(w);
    else break;
  }
  return out.join(" ");
}

// `firstLine: false` skips the last resort (the text's first line): for a transcript, whose first
// line is someone talking, not a title.
export function candidatesFrom(text: string, max = 5, { firstLine = true }: { firstLine?: boolean } = {}): string[] {
  const src = text.replace(URL_RE, " ");
  const out: string[] = [];
  // Said out loud (a reel's transcript): "a movie called Coherence", "the film is titled Oldboy",
  // "you have to watch Interstellar". Spoken titles come first: a narrator naming the film is the
  // surest sign there is.
  const spoken: string[] = [];
  for (const m of src.matchAll(/\b(?:movie|film|series|show|anime|documentary|k-?drama)\s+(?:is\s+)?(?:called|named|titled)\s+([^.,!?;\n]{2,50})/gi)) spoken.push(m[1]);
  for (const m of src.matchAll(/\b(?:called|titled)\s+["“]?([A-Z0-9][^.,!?;\n"”]{1,50})/g)) spoken.push(m[1]);
  for (const m of src.matchAll(/\b(?:watch|watched|watching|check out|recommend)\s+(?:the\s+(?:movie|film|show|series)\s+)?["“]?((?:[A-Z0-9][\w'’:-]*)(?:\s+(?:of|the|and|a|in|on|to|[A-Z0-9][\w'’:-]*)){0,6})/g)) spoken.push(m[1]);
  const add = (s: string | undefined) => {
    const c = clean(s ?? "");
    if (c.length < 2 || c.length > 70 || /^\d+$/.test(c)) return;
    if (GENERIC.has(c.toLowerCase().replace(/\s+/g, ""))) return;
    if (!out.some((o) => o.toLowerCase() === c.toLowerCase())) out.push(c);
  };
  for (const m of src.matchAll(/["“”«»]([^"“”«»\n]{2,70})["“”«»]/g)) add(m[1]);
  for (const s of spoken) add(titleRun(s));
  for (const m of src.matchAll(/(?:\b(?:movie|film|series|show|anime|title|watching|watch)\b|🎬|🎥|📽️?)\s*(?:name\s*)?[:：\-–—]\s*([^\n#|•@]{2,70})/giu)) add(m[1]?.split(/[.!?]\s/)[0]);
  for (const m of src.matchAll(/([A-Z0-9][^\n#()"“”]{0,60}?)\s*\((?:19|20)\d{2}\)/g)) add(m[1]);
  for (const m of src.matchAll(/#([\p{L}\p{N}_]{3,40})/gu)) {
    if (/fyp|viral|foryou|trend/i.test(m[1]) || GENERIC.has(m[1].toLowerCase())) continue;
    add(fromHashtag(m[1]));
  }
  const first = firstLine ? src.split("\n").map((l) => l.replace(/[#@][\p{L}\p{N}_]+/gu, " ")).find((l) => clean(l).length >= 3) : undefined;
  if (first) {
    add(first.replace(NOISE, " ").split(/\s[-–—|•:]\s|\s\/\s/)[0]);
    add(first.slice(0, 70));
  }
  return out.slice(0, max);
}

// A release year named in the text, to prefer the right one of two same-named titles.
export function yearFrom(text: string): number | null {
  const m = /\b(19[2-9]\d|20[0-4]\d)\b/.exec(text.replace(URL_RE, " "));
  return m ? Number(m[1]) : null;
}

// The first link in some text (a share often puts it in the text, not the url).
export function firstUrl(text: string): string | null {
  return text.match(URL_RE)?.[0]?.replace(/[)\].,!?]+$/, "") ?? null;
}

// How well a catalog title's name matches a guess, for ranking what the search found.
export function matchScore(name: string, guess: string) {
  const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const n = norm(name), g = norm(guess);
  if (!n || !g) return 0;
  if (n === g) return 100;
  if (n.startsWith(g) || g.startsWith(n)) return 60;
  if (n.includes(g) || g.includes(n)) return 40;
  const words = new Set(g.split(" "));
  const shared = n.split(" ").filter((w) => words.has(w)).length;
  return Math.round((shared / Math.max(words.size, 1)) * 30);
}

// A search for several titles at once: "avengers, hulk, interstellar" is three searches. Only commas
// (or semicolons, or new lines) split it, so a title with spaces ("the dark knight") stays one.
export function splitTerms(q: string, max = 6): string[] {
  const seen = new Set<string>();
  return q
    .split(/[,;\n]+/)
    .map((t) => t.trim().slice(0, 100))
    .filter((t) => t.length >= 2 && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
    .slice(0, max);
}
