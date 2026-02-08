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
  // Prefer RoyaleAPI CDN images first. They ship permissive CORS headers, avoiding
  // browser console noise when `api-assets.clashroyale.com` blocks cross-origin usage.
  const cdnSrc = useMemo(() => {
    return getCardImageUrl(name, size === "sm" ? "small" : size === "lg" ? "large" : "medium");
  }, [name, size]);

  const apiSrc = useMemo(() => {
    return getCardImageFromApi(iconUrls ?? undefined);
  }, [iconUrls]);

  const [src, setSrc] = useState(cdnSrc);
  const [fallbackStep, setFallbackStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    setSrc(cdnSrc);
    setFallbackStep(0);
  }, [cdnSrc]);

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
        className="w-full h-full object-contain"
        loading="lazy"
        onError={() => {
          setFallbackStep((step) => {
            // Step 0: CDN failed. Step 1: API failed. Step 2: placeholder.
            if (step === 0) {
              if (apiSrc) {
                setSrc(apiSrc);
                return 1;
              }
              setSrc(CARD_BACK_URL);
              return 2;
            }

            if (step === 1) {
              setSrc(CARD_BACK_URL);
              return 2;
            }

            return step;
          });
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
