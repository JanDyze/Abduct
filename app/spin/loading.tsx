import { Bone, PageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <PageSkeleton title="Pick for me">
      <Bone className="mx-auto mt-4 h-[364px] w-full max-w-xs rounded-3xl" />
      <Bone className="mt-6 h-12 rounded-2xl" />
    </PageSkeleton>
  );
}
