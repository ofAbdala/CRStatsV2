import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

/**
 * Reusable empty state component (AC9).
 *
 * Shows a centered card with an icon, title, description, and optional CTA.
 * Used when a page or section has no data to display.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <Card className={className ?? "border-border/50 bg-card/50"}>
      <CardContent className="py-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {description}
        </p>
        {actionLabel && onAction ? (
          <Button onClick={onAction} size="sm">
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default EmptyState;
