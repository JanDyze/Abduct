"use client";

import { CatalogPoster, useCatalogAdds } from "@/components/catalog-poster";
import type { CatalogResult } from "@/lib/titles/normalize";

// Catalog posters three across, each with a + that puts it on your default list (search results).
export function CatalogGrid({ results, listName }: { results: CatalogResult[]; listName: string }) {
  const adds = useCatalogAdds(listName);
  return (
    <>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
        {results.map((r) => (
          <li key={`${r.source}:${r.sourceId}`}>
            <CatalogPoster result={r} adds={adds} />
          </li>
        ))}
      </ul>
      {adds.toast}
    </>
  );
}
