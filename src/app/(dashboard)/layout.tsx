import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function PageLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

/**
 * Dashboard layout with two-layer authentication protection
 *
 * Layer 1 (proxy.ts): Optimistic cookie check, redirects to /login if no cookie
 * Layer 2 (this layout): Authoritative session validation, redirects if invalid session
 *
 * Session validation occurs BEFORE children render → zero content flash (Decision D12)
 * This is the TRUE security boundary - proxy.ts is just UX optimization
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layer 2: Authoritative session validation
  // This is the TRUE security boundary
  // Call auth.api.getSession() to validate session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If no valid session → redirect to /login
  // This happens BEFORE any children render (zero content flash, Decision D12)
  if (!session) {
    redirect("/login");
  }

  // Valid session → render children wrapped in layout
  // Note: TopBar and AppSidebar currently use currentUser() from current-user.ts
  // In future, we can pass session.user to these components for better data flow
  return (
    <SidebarProvider>
      {/* Skip-to-content link - visible on keyboard focus */}
      <a
        href="#main-content"
        className="focus:bg-background focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2"
      >
        Skip to main content
      </a>

      {/* App Sidebar */}
      <AppSidebar />

      <SidebarInset>
        {/* Top Bar */}
        <TopBar />

        <main
          id="main-content"
          className="min-w-0 flex-1 overflow-auto p-4 md:p-6"
        >
          <Suspense fallback={<PageLoadingSkeleton />}>{children}</Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
