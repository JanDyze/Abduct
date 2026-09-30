import { AppHeader, type BackLink } from "@/components/app-header";
import { PageTransition } from "@/components/page-transition";
import { cn } from "@/lib/utils";

// Page frame: sticky header outside the transition, content inside it so only the content slides.
// `header={false}` is for a page whose first card already does the header's job (home).
export function Screen({
  back,
  title,
  subtitle,
  action,
  header = true,
  className,
  children,
}: {
  back?: BackLink;
  title?: string; // shown in the top bar instead of a big in-page heading
  subtitle?: string;
  action?: React.ReactNode;
  header?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {header && (
        <AppHeader back={back} title={title} subtitle={subtitle}>
          {action}
        </AppHeader>
      )}
      <PageTransition>
        <main
          className={cn(
            "mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-[max(3rem,env(safe-area-inset-bottom))]",
            header ? "pt-5" : "pt-[max(1.25rem,env(safe-area-inset-top))]",
            className,
          )}
        >
          {children}
        </main>
      </PageTransition>
    </>
  );
}
