// A list's cover: one of the icons in public/list-icons.svg (traced from brand/Abduct Icons.png by
// brand/trace_icons.py, plus the hand-drawn ones from brand/extra_icons.mjs) and a color. The icon's orange parts take the list's color, so lists can be
// told apart at a glance. Labels are for screen readers and tooltips only; the picker shows none.
export const LIST_ICONS = [
  { id: "popcorn", label: "Popcorn" },
  { id: "heroes", label: "Heroes" },
  { id: "horror", label: "Horror" },
  { id: "comedy", label: "Comedy" },
  { id: "romance", label: "Romance" },
  { id: "action", label: "Action" },
  { id: "sci-fi", label: "Sci-fi" },
  { id: "fantasy", label: "Fantasy" },
  { id: "mystery", label: "Mystery" },
  { id: "thriller", label: "Thriller" },
  { id: "adventure", label: "Adventure" },
  { id: "animation", label: "Animation" },
  { id: "drama", label: "Drama" },
  { id: "family", label: "Family" },
  { id: "crime", label: "Crime" },
  { id: "documentary", label: "Documentary" },
  { id: "music", label: "Music" },
  { id: "western", label: "Western" },
  { id: "sports", label: "Sports" },
  { id: "war", label: "War" },
  { id: "history", label: "History" },
  { id: "nature", label: "Nature" },
  { id: "space", label: "Space" },
  { id: "monsters", label: "Monsters" },
  { id: "zombies", label: "Zombies" },
  { id: "vampires", label: "Vampires" },
  { id: "aliens", label: "Aliens" },
  { id: "robots", label: "Robots" },
  { id: "comics", label: "Comics" },
  { id: "anime", label: "Anime" },
  { id: "swords", label: "Swords" },
  { id: "guns", label: "Guns" },
  { id: "slasher", label: "Slasher" },
  { id: "pirates", label: "Pirates" },
  { id: "ninjas", label: "Ninjas" },
  { id: "spies", label: "Spies" },
  { id: "knights", label: "Knights" },
  { id: "spiders", label: "Spiders" },
  { id: "apocalypse", label: "Apocalypse" },
  { id: "time-travel", label: "Time travel" },
  { id: "magic", label: "Magic" },
  { id: "rockets", label: "Rockets" },
  { id: "explosive", label: "Explosive" },
  { id: "racing", label: "Racing" },
  { id: "games", label: "Games" },
  { id: "books", label: "Books" },
  { id: "series", label: "Series" },
  { id: "classics", label: "Classics" },
  { id: "awards", label: "Awards" },
  { id: "favorites", label: "Favorites" },
  { id: "watchlist", label: "Watchlist" },
  { id: "watched", label: "Watched" },
  { id: "rewatch", label: "Rewatch" },
  { id: "top-picks", label: "Top picks" },
  { id: "hidden-gems", label: "Hidden gems" },
  { id: "date-night", label: "Date night" },
  { id: "with-friends", label: "With friends" },
  { id: "movie-night", label: "Movie night" },
  { id: "weekend", label: "Weekend" },
  { id: "late-night", label: "Late night" },
  { id: "rainy-day", label: "Rainy day" },
  { id: "feel-good", label: "Feel good" },
  { id: "tearjerkers", label: "Tearjerkers" },
  { id: "mind-benders", label: "Mind benders" },
  { id: "cozy", label: "Cozy" },
  { id: "nostalgia", label: "Nostalgia" },
  { id: "epic", label: "Epic" },
  { id: "trending", label: "Trending" },
  { id: "kids", label: "Kids" },
  { id: "animals", label: "Animals" },
  { id: "halloween", label: "Halloween" },
  { id: "christmas", label: "Christmas" },
  { id: "summer", label: "Summer" },
  { id: "winter", label: "Winter" },
  { id: "ocean", label: "Ocean" },
  { id: "travel", label: "Travel" },
  { id: "random", label: "Random" },
  { id: "my-list", label: "My list" },
] as const;

export type ListIconId = (typeof LIST_ICONS)[number]["id"];
export const LIST_ICON_IDS = LIST_ICONS.map((i) => i.id) as [ListIconId, ...ListIconId[]];

// A list as pickers and filters show it.
export type ListOption = { id: string; name: string; icon: string; color: string };

// Picked to stay apart from each other and readable on the dark background. Orange is the brand's.
export const LIST_COLORS = [
  { id: "orange", label: "Orange", value: "#fba825" },
  { id: "red", label: "Red", value: "#f2555a" },
  { id: "pink", label: "Pink", value: "#f06baa" },
  { id: "purple", label: "Purple", value: "#a78bfa" },
  { id: "blue", label: "Blue", value: "#5b9df5" },
  { id: "teal", label: "Teal", value: "#2ec4b6" },
  { id: "green", label: "Green", value: "#6bcb77" },
  { id: "slate", label: "Slate", value: "#94a3b8" },
] as const;

export type ListColorId = (typeof LIST_COLORS)[number]["id"];
export const LIST_COLOR_IDS = LIST_COLORS.map((c) => c.id) as [ListColorId, ...ListColorId[]];

export const DEFAULT_ICON: ListIconId = "watchlist";
export const DEFAULT_COLOR: ListColorId = "orange";

export function iconLabel(id: string) {
  return LIST_ICONS.find((i) => i.id === id)?.label ?? "List";
}

// A stored color id as its hex value; anything unknown falls back to orange.
export function colorValue(id: string | null | undefined) {
  return (LIST_COLORS.find((c) => c.id === id) ?? LIST_COLORS[0]).value;
}
