import { cn } from "@/lib/utils";

// The pieces loading placeholders are made of (a shimmering block, a grid or row of posters), for
// pages' skeletons (components/skeletons.tsx) and for parts that reload in place.

export function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn("skeleton rounded-xl", className)} style={style} />;
}

export function PosterGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <Bone className="aspect-[2/3]" style={{ animationDelay: `${i * 60}ms` }} />
          <Bone className="mt-2 h-3 w-3/4 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function PosterRowSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <Bone key={i} className="aspect-[2/3] w-28 shrink-0" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}
