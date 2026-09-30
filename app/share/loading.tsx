import { Bone, PageSkeleton } from "@/components/skeletons";

// Reading a shared reel can take a moment (its caption comes from the site it was shared from).
export default function Loading() {
  return (
    <PageSkeleton title="From your share">
      <Bone className="h-20 rounded-2xl" />
      <div className="mt-5 flex gap-4 rounded-3xl border bg-card p-4">
        <Bone className="aspect-[2/3] w-32 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Working out what it is…</p>
          <Bone className="mt-2 h-7 w-3/4 rounded-lg" />
          <Bone className="mt-2 h-4 w-1/2 rounded-md" />
        </div>
      </div>
    </PageSkeleton>
  );
}
