import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CARD_BACK_URL, getCardImageFromApi, getCardImageUrl } from "@/lib/clashIcons";

type ClashIconUrls = { medium?: string; small?: string } | null | undefined;

export type ClashCardImageSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<ClashCardImageSize, string> = {
  sm: "w-7 h-9",
  md: "w-12 h-16",
  lg: "w-16 h-20",
};

export default function ClashCardImage({
  name,
  iconUrls,
  level,
  size = "md",
  className,
  showLevel = true,
}: {
  name: string;
  iconUrls?: ClashIconUrls;
  level?: number | null;
  size?: ClashCardImageSize;
  className?: string;
  showLevel?: boolean;
}) {
  const primarySrc = useMemo(() => {
    const fromApi = getCardImageFromApi(iconUrls ?? undefined);
    return fromApi || getCardImageUrl(name, size === "sm" ? "small" : size === "lg" ? "large" : "medium");
  }, [iconUrls, name, size]);

  const [src, setSrc] = useState(primarySrc);

  useEffect(() => {
    setSrc(primarySrc);
  }, [primarySrc]);

  return (
    <div
      className={cn(
        "relative rounded-md overflow-hidden border border-white/10 bg-black/20",
        SIZE_CLASS[size],
        className,
      )}
      title={name}
    >
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => {
          if (src !== CARD_BACK_URL) setSrc(CARD_BACK_URL);
        }}
      />
      {showLevel && typeof level === "number" ? (
        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-center py-0.5 text-white font-bold">
          Lvl {level}
        </div>
      ) : null}
    </div>
  );
}

