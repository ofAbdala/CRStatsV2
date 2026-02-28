import { Link, useLocation } from "wouter";
import { Home, Layers, Bot, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

const NAV_ITEMS = [
  { key: "nav.home", href: "/dashboard", icon: Home },
  { key: "nav.decks", href: "/decks", icon: Layers },
  { key: "nav.coach", href: "/coach", icon: Bot },
  { key: "nav.community", href: "/community", icon: Users },
  { key: "nav.profile", href: "/me", icon: User },
] as const;

export function BottomNav() {
  const [location] = useLocation();
  const { t } = useLocale();
  const pathname = location.split("?")[0];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/50 bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname === "/") ||
            (item.href === "/me" && pathname.startsWith("/me"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] px-2 py-1 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon
                className={cn(
                  "w-5 h-5",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                )}
              />
              <span className="text-[10px] font-medium leading-tight">
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
