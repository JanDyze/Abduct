import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HideOnScroll } from "@/components/hide-on-scroll";
import { cn } from "@/lib/utils";

export type BackLink = { href: string; label: string };

// Sticky top bar. Two layouts:
// - title: icon-only back arrow + page title and subtitle (e.g. "Watchlist", "12 titles")
// - neither: the Abduct wordmark
// It keeps a fixed view-transition name so it stays put while pages slide underneath, and hides
// while scrolling down (HideOnScroll). Back replaces the page, so the phone's own Back doesn't
// return to the page you just left.
export function AppHeader({
  back,
  title,
  subtitle,
  children,
}: {
  back?: BackLink;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <HideOnScroll
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-30 border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md"
    >
      <div className={cn("mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4", title ? "h-16" : "h-14")}>
        {title ? (
          <div className="flex min-w-0 items-center gap-1">
            {back && (
              <Link
                href={back.href}
                replace
                transitionTypes={["nav-back"]}
                aria-label={`Back to ${back.label}`}
                className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </Link>
            )}
            <div className="min-w-0">
              <h1 className="truncate font-brand text-2xl leading-tight font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        ) : (
          <Link href="/" replace transitionTypes={["nav-back"]} className="flex items-center gap-2">
            <Image src="/logo.svg" alt="" width={36} height={28} unoptimized />
            <span className="font-brand text-2xl leading-none font-bold tracking-tight text-hull">Abduct</span>
          </Link>
        )}
        {children}
      </div>
    </HideOnScroll>
  );
}
