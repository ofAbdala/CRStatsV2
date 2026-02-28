import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  isMobile: boolean;
  onMobileMenuClick: () => void;
}

export function Topbar({ isMobile, onMobileMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden min-h-[44px] min-w-[44px]"
        onClick={onMobileMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-xs font-bold text-primary-foreground">CR</span>
        </div>
        <span className="font-display font-bold text-lg text-foreground tracking-tight">
          CRStats
        </span>
      </div>
    </header>
  );
}
