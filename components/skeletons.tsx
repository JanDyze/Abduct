import { Screen } from "@/components/screen";
import { Bone, PosterGridSkeleton, PosterRowSkeleton } from "@/components/skeleton-bits";
import { TitleHeroSkeleton } from "@/components/title-hero-skeleton";
import type { BackLink } from "@/components/app-header";

// Loading placeholders, shown the moment a page is opened (the routes' loading.tsx) while the server
// works on it: the same top bar and layout as the page, with shimmering blocks where its content
// will be, so a tap always shows something happening.
export { Bone, PosterGridSkeleton, PosterRowSkeleton };

function Loading() {
  return <span className="sr-only">Loading</span>;
}

// A page's frame (top bar and all) with rows of shimmer: the default.
export function PageSkeleton({ title, back = { href: "/", label: "Home" }, children }: { title?: string; back?: BackLink; children?: React.ReactNode }) {
  return (
    <Screen back={back} title={title ?? " "}>
      <Loading />
      {children ?? (
        <div className="flex flex-col gap-3">
          <Bone className="h-24 rounded-2xl" />
          {Array.from({ length: 5 }, (_, i) => (
            <Bone key={i} className="h-16 rounded-2xl" style={{ animationDelay: `${i * 70}ms` }} />
          ))}
        </div>
      )}
    </Screen>
  );
}

export function DiscoverSkeleton() {
  return (
    <PageSkeleton title="Discover">
      <Bone className="h-12 rounded-2xl" />
      {[0, 1].map((s) => (
        <div key={s} className="mt-8">
          <Bone className="h-6 w-40 rounded-lg" />
          <Bone className="mt-3 mb-3 h-10 rounded-xl" />
          <PosterRowSkeleton />
        </div>
      ))}
    </PageSkeleton>
  );
}

export function BrowseSkeleton() {
  return (
    <PageSkeleton title=" " back={{ href: "/discover", label: "Discover" }}>
      <Bone className="h-10 rounded-xl" />
      <div className="mt-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Bone key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <Bone className="mt-4 mb-3 h-4 w-2/3 rounded-md" />
      <PosterGridSkeleton />
    </PageSkeleton>
  );
}

export function ListSkeleton() {
  return (
    <PageSkeleton title=" " back={{ href: "/lists", label: "My lists" }}>
      <Bone className="mb-4 h-12 rounded-2xl" />
      <div className="mb-4 flex gap-2">
        <Bone className="h-9 w-24 rounded-full" />
        <Bone className="h-9 w-24 rounded-full" />
      </div>
      <PosterGridSkeleton />
    </PageSkeleton>
  );
}

// A title's page: the poster you tapped already in place (so it grows straight into it), the rest
// shimmering.
export function TitleSkeleton() {
  return (
    <Screen back={{ href: "/", label: "Back" }} title=" " className="pt-0">
      <Loading />
      <TitleHeroSkeleton />
      <div className="mt-4 flex gap-1.5">
        <Bone className="h-7 w-20 rounded-full" />
        <Bone className="h-7 w-24 rounded-full" />
      </div>
      <Bone className="mt-5 h-12 rounded-2xl" />
      <Bone className="mt-6 h-5 w-36 rounded-lg" />
      <div className="mt-3 flex gap-2">
        <Bone className="h-10 w-28" />
        <Bone className="h-10 w-28" />
      </div>
      <Bone className="mt-6 h-4 w-full rounded-md" />
      <Bone className="mt-2 h-4 w-11/12 rounded-md" />
      <Bone className="mt-2 h-4 w-4/5 rounded-md" />
    </Screen>
  );
}
