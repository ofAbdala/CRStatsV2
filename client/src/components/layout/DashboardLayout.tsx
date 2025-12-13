import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  MessageSquare, 
  User, 
  Settings, 
  LogOut, 
  Swords, 
  Menu,
  X,
  Target,
  Layers,
  Globe,
  Bell,
  CreditCard,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { mockNotifications } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.subscription.get(),
  });

  const isPro = (subscription as any)?.plan === 'PRO' || (subscription as any)?.plan === 'pro' || (subscription as any)?.status === 'active';

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Coach IA", href: "/coach", icon: MessageSquare },
    { name: "Treino", href: "/training", icon: Target },
    { name: "Decks", href: "/decks", icon: Layers },
    { name: "Comunidade", href: "/community", icon: Globe },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Configurações", href: "/settings", icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <Link href="/">
          <div className="flex items-center gap-2 mb-8 cursor-pointer interactive-hover">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Swords className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-sidebar-foreground tracking-tight">
              CRStats
            </span>
          </div>
        </Link>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground translate-x-1"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-1"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-sidebar-border">
        <div className={cn(
          "p-4 rounded-xl mb-4 border",
          isPro 
            ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30" 
            : "bg-card/30 border-primary/20"
        )}>
          <h4 className="font-bold text-sm mb-1 flex items-center gap-2" data-testid="text-plan-status">
            {isPro ? (
              <>
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-500">Plano PRO</span>
              </>
            ) : (
              <span className="text-primary">Plano Free</span>
            )}
          </h4>
          {isPro ? (
            <p className="text-xs text-muted-foreground">Acesso ilimitado</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">2/5 mensagens diárias</p>
              <Link href="/billing">
                <Button size="sm" className="w-full text-xs font-bold" variant="outline">Upgrade PRO</Button>
              </Link>
            </>
          )}
        </div>

        <Link href="/profile">
          <div className="flex items-center gap-3 mb-4 cursor-pointer p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
            <Avatar className="w-8 h-8 border border-border">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>KS</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-sidebar-foreground">KingSlayer</span>
                {isPro && (
                  <Badge 
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] px-1.5 py-0"
                    data-testid="badge-subscription-pro"
                  >
                    <Crown className="w-2.5 h-2.5 mr-0.5" />
                    PRO
                  </Badge>
                )}
              </div>
              <span className="text-xs text-sidebar-foreground/60">Ver Perfil</span>
            </div>
          </div>
        </Link>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors" 
          size="sm"
          onClick={() => { window.location.href = "/api/logout"; }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 fixed inset-y-0 z-50">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Swords className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-sidebar-foreground">
              CRStats
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationsPopover />
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r border-sidebar-border bg-sidebar">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="max-w-6xl mx-auto">
           {/* Desktop Header Actions */}
           <div className="hidden md:flex justify-end mb-6 gap-4">
             <NotificationsPopover />
           </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function NotificationsPopover() {
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-background animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-border">
          <h4 className="font-bold">Notificações</h4>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {mockNotifications.map((notification) => (
            <div key={notification.id} className={cn("p-4 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer", !notification.read && "bg-primary/5")}>
              <div className="flex justify-between items-start mb-1">
                <h5 className="text-sm font-medium">{notification.title}</h5>
                <span className="text-[10px] text-muted-foreground">{notification.time}</span>
              </div>
              <p className="text-xs text-muted-foreground">{notification.description}</p>
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-border bg-muted/20">
          <Button variant="ghost" size="sm" className="w-full text-xs">Marcar todas como lidas</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}


