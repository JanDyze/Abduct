// A screen's path as the admin dashboard counts it: ids folded to :id and the query dropped, so it
// records which screen was opened (a list, a title), never which list or title.
export function foldPath(raw: string) {
  const path = raw.split(/[?#]/)[0].slice(0, 200) || "/";
  return path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, "/:id");
}
