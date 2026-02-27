import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get(),
  });

  const sub = subscription as { plan?: string; status?: string } | undefined;
  const subscriptionPlan = typeof sub?.plan === "string" ? sub.plan.toLowerCase() : "";
  const isPro = subscriptionPlan === "pro" && sub?.status === "active";

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Skip Navigation Link (AC3: TD-043) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:font-medium focus:text-sm focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 z-50">
        <Sidebar isPro={isPro} />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r border-sidebar-border bg-sidebar">
          <Sidebar isPro={isPro} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <Topbar
          isMobile={true}
          onMobileMenuClick={() => setIsMobileOpen(true)}
        />

        <main id="main-content" className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in custom-scrollbar overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

