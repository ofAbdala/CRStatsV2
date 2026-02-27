import { Link, useLocation, useSearch } from "wouter";
import {
    Bell,
    CreditCard,
    Crown,
    ChevronDown,
    ChevronRight,
    Globe,
    Layers,
    LayoutDashboard,
    LogOut,
    MessageSquare,
    Settings,
    Swords,
    Target,
    User,
    Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import { useProfile } from "@/hooks/useProfile";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";

interface SidebarProps {
    isPro: boolean;
    className?: string;
}

type DecksTab = "meta" | "counter" | "optimizer";

export function Sidebar({ isPro, className }: SidebarProps) {
    const [location, setLocation] = useLocation();
    const search = useSearch();
    const pathname = location.split("?")[0];
    const { t } = useLocale();
    const { data: profile } = useProfile();

    const playerName = (profile as any)?.displayName || t("layout.defaultPlayerName");
    const profileImageUrl = (profile as any)?.profileImageUrl || null;
    const playerInitials = playerName.substring(0, 2).toUpperCase();

    const decksTabParam = new URLSearchParams(search).get("tab");
    const decksTab: DecksTab =
        decksTabParam === "meta" || decksTabParam === "counter" || decksTabParam === "optimizer" ? decksTabParam : "meta";

    const [isDecksOpen, setIsDecksOpen] = useState(() => pathname === "/decks");

    useEffect(() => {
        if (pathname === "/decks") {
            setIsDecksOpen(true);
            return;
        }
    }, [pathname]);

    const navigation = [
        { key: "nav.dashboard", href: "/home", icon: LayoutDashboard }, // Renamed path to /home conceptually, code uses /dashboard or /home? Vision says /home. Let's use /dashboard for now to match current router, alias later? Or change to /home. Plan says "Rename: Conceptually /home". I will stick to /dashboard for now to avoid breaking router immediately, or I should update router. I'll use /dashboard in link but maybe label "Home".
        // Wait, Vision 3.1 says "HOME (rota: /home)". I should probably update router.ts later. For now, let's use /home and I will update router.
        { key: "nav.push", href: "/push", icon: Zap }, // New Push route
        { key: "nav.coach", href: "/coach", icon: MessageSquare },
        { key: "nav.decks", href: "/decks", icon: Layers },
        { key: "nav.training", href: "/training", icon: Target, pro: true },
        { key: "nav.community", href: "/community", icon: Globe },
        { key: "nav.notifications", href: "/notifications", icon: Bell },
        { key: "nav.billing", href: "/billing", icon: CreditCard },
        { key: "nav.settings", href: "/settings", icon: Settings },
    ];

    return (
        <div className={cn("flex flex-col h-full bg-sidebar border-r border-sidebar-border", className)}>
            <div className="p-6">
                <Link href="/">
                    <div className="flex items-center gap-2 mb-8 cursor-pointer interactive-hover">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                            <Swords className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="font-display font-bold text-xl text-sidebar-foreground tracking-tight text-shadow-glow">
                            CRStats
                        </span>
                    </div>
                </Link>

                <nav className="space-y-1">
                    {navigation.map((item) => {
                        if (item.href === "/decks") {
                            const isActive = pathname === item.href;
                            return (
                                <Collapsible key={item.href} open={isDecksOpen} onOpenChange={setIsDecksOpen}>
                                    <CollapsibleTrigger asChild>
                                        <button
                                            type="button"
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 w-full group",
                                                isActive
                                                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                                                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                            )}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                if (pathname !== "/decks") {
                                                    setLocation("/decks?tab=meta");
                                                    setIsDecksOpen(true);
                                                    return;
                                                }
                                                setIsDecksOpen((open) => !open);
                                            }}
                                        >
                                            <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                                            <span className="flex-1 text-left">{t(item.key)}</span>
                                            {isDecksOpen ? (
                                                <ChevronDown className="w-4 h-4 opacity-70" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 opacity-70" />
                                            )}
                                        </button>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                        <div className="mt-1 space-y-1 ml-4 border-l border-sidebar-border/50 pl-2">
                                            <Link
                                                href="/decks?tab=meta"
                                                onClick={() => setIsDecksOpen(true)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200",
                                                    isActive && decksTab === "meta"
                                                        ? "text-primary font-medium bg-sidebar-accent/30"
                                                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                                )}
                                            >
                                                {t("nav.metaDecks")}
                                            </Link>

                                            <Link
                                                href="/decks?tab=counter"
                                                onClick={() => setIsDecksOpen(true)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200",
                                                    isActive && decksTab === "counter"
                                                        ? "text-primary font-medium bg-sidebar-accent/30"
                                                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                                )}
                                            >
                                                {t("nav.counterDeck")}
                                            </Link>

                                            <Link
                                                href="/decks?tab=optimizer"
                                                onClick={() => setIsDecksOpen(true)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200",
                                                    isActive && decksTab === "optimizer"
                                                        ? "text-primary font-medium bg-sidebar-accent/30"
                                                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                                )}
                                            >
                                                {t("nav.improveMyDeck")}
                                            </Link>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        }

                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                                {t(item.key)}
                                {item.pro && !isPro && (
                                    <Crown className="w-3 h-3 text-yellow-500 absolute right-2" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-4 border-t border-sidebar-border bg-sidebar-accent/10">

                {/* Active Player Card / Profile Button */}
                <Link href="/me">
                    <div className="flex items-center gap-3 mb-2 cursor-pointer p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors group">
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
