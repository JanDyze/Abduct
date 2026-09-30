import { PageSkeleton, PosterGridSkeleton, Bone } from "@/components/skeletons";

export default function Loading() {
  return (
    <PageSkeleton title="Search" back={{ href: "/discover", label: "Discover" }}>
      <Bone className="mb-5 h-12 rounded-2xl" />
      <PosterGridSkeleton />
    </PageSkeleton>
  );
}
