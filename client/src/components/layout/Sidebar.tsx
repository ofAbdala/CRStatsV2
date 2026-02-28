import { Link, useLocation } from "wouter";
import {
    Bot,
    CreditCard,
    Crown,
    Globe,
    Home,
    Layers,
    LogOut,
    Settings,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import { useProfile } from "@/hooks/useProfile";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface SidebarProps {
    isPro: boolean;
    className?: string;
}

/**
 * Sidebar navigation restructured per AC5/AC6:
 *
 * Primary:   Home, Decks, Coach, Community, Profile
 * Secondary: Settings, Subscription (below separator)
 *
 * Sub-sections (Meta/Counter/Optimizer, etc.) are handled as tabs
 * within the respective page, not as nested sidebar items.
 */

const PRIMARY_NAV = [
    { key: "nav.home", href: "/dashboard", icon: Home },
    { key: "nav.decks", href: "/decks", icon: Layers },
    { key: "nav.coach", href: "/coach", icon: Bot },
    { key: "nav.community", href: "/community", icon: Globe },
    { key: "nav.profile", href: "/me", icon: User },
] as const;

const SECONDARY_NAV = [
    { key: "nav.settings", href: "/settings", icon: Settings },
    { key: "nav.billing", href: "/billing", icon: CreditCard },
] as const;

export function Sidebar({ isPro, className }: SidebarProps) {
    const [location] = useLocation();
    const pathname = location.split("?")[0];
    const { t } = useLocale();
    const { data: profile } = useProfile();

    const playerName = profile?.displayName || t("layout.defaultPlayerName");
    const profileImageUrl: string | null = null;
    const playerInitials = playerName.substring(0, 2).toUpperCase();

    function isActive(href: string) {
        if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
        if (href === "/me") return pathname === "/me" || pathname === "/me/";
        return pathname === href || pathname.startsWith(href + "/");
    }

    return (
        <div className={cn("flex flex-col h-full bg-sidebar border-r border-sidebar-border", className)}>
            {/* Logo */}
            <div className="p-6 pb-4">
                <Link href="/">
                    <div className="flex items-center gap-2 cursor-pointer interactive-hover">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                            <span className="text-xs font-bold text-primary-foreground">CR</span>
                        </div>
                        <span className="font-display font-bold text-xl text-sidebar-foreground tracking-tight text-shadow-glow">
                            CRStats
                        </span>
                    </div>
                </Link>
            </div>

            {/* Primary navigation */}
            <nav className="flex-1 px-4 space-y-1" aria-label="Main navigation">
                {PRIMARY_NAV.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group min-h-[44px]",
                                active
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            )}
                            aria-current={active ? "page" : undefined}
                        >
                            <item.icon className={cn("w-5 h-5 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                            {t(item.key)}
                        </Link>
                    );
                })}

                {/* Separator */}
                <div className="my-3 border-t border-sidebar-border/50" />

                {/* Secondary navigation */}
                {SECONDARY_NAV.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group min-h-[44px]",
                                active
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            )}
                            aria-current={active ? "page" : undefined}
                        >
                            <item.icon className={cn("w-5 h-5 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                            {t(item.key)}
                        </Link>
                    );
                })}
            </nav>

            {/* Player card footer */}
            <div className="mt-auto p-4 border-t border-sidebar-border bg-sidebar-accent/10">
                <Link href="/me">
                    <div className="flex items-center gap-3 mb-2 cursor-pointer p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors group min-h-[44px]">
                        <Avatar className="w-9 h-9 border border-primary/20 group-hover:border-primary/50 transition-colors">
                            {profileImageUrl ? <AvatarImage src={profileImageUrl} /> : null}
                            <AvatarFallback>{playerInitials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-sidebar-foreground truncate">{playerName}</span>
                                {isPro && (
                                    <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] px-1.5 py-0 h-4">
                                        PRO
                                    </Badge>
                                )}
                            </div>
                            <span className="text-xs text-sidebar-foreground/50 group-hover:text-primary/80 transition-colors">
                                {t("layout.viewProfile")}
                            </span>
                        </div>
                    </div>
                </Link>

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground h-8"
                        onClick={() => {
                            // Open switch account modal (future)
                        }}
                    >
                        <User className="w-3 h-3 mr-2" />
                        {t("nav.switchAccount")}
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full justify-start text-xs text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 h-8"
                        onClick={() => {
                            getSupabaseClient()
                                .auth.signOut()
                                .catch(() => undefined)
                                .finally(() => {
                                    window.location.href = "/";
                                });
                        }}
                    >
                        <LogOut className="w-3 h-3 mr-2" />
                        {t("nav.logout")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
