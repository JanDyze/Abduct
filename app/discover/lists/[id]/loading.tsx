import { PageSkeleton, PosterGridSkeleton, Bone } from "@/components/skeletons";

export default function Loading() {
  return (
    <PageSkeleton title=" " back={{ href: "/discover", label: "Discover" }}>
      <Bone className="mb-5 h-24 rounded-2xl" />
      <PosterGridSkeleton />
    </PageSkeleton>
  );
}
