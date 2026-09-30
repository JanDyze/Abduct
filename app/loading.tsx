import { PageSkeleton } from "@/components/skeletons";

// Shown at once while any page without its own skeleton is being made.
export default function Loading() {
  return <PageSkeleton />;
}
