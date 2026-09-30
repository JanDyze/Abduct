import { TitleSkeleton } from "@/components/skeletons";

// The tapped poster already in place, so opening a title never waits on a blank screen.
export default function Loading() {
  return <TitleSkeleton />;
}
