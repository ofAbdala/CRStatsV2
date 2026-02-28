import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

interface QuickActionsProps {
  onAction: (content: string) => void;
  disabled?: boolean;
}

export function QuickActions({ onAction, disabled }: QuickActionsProps) {
  const { t } = useLocale();

  const prompts = [
    t("pages.coach.quickPrompts.lastLoss"),
    t("pages.coach.quickPrompts.reduceTilt"),
    t("pages.coach.quickPrompts.deckAdjust"),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <Button
          key={prompt}
          variant="outline"
          size="sm"
          className="text-xs min-h-[44px]"
          onClick={() => onAction(prompt)}
          disabled={disabled}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
