// After adding a title to your default list without choosing one, asks the server to sort it into
// the list it belongs on (app/api/sort-item). Resolves to where it went, or null when it stayed.
export type Sorted = { listId: string; listName: string; icon: string; color: string; created: boolean; itemId: string };

export async function sortAdded(itemId: string): Promise<Sorted | null> {
  try {
    const res = await fetch("/api/sort-item", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemId }) });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body?.listId === "string" ? body : null;
  } catch {
    return null;
  }
}
