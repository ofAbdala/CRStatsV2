/**
 * Skeleton loading components for content-heavy pages (AC8).
 *
 * Uses the existing shadcn Skeleton primitive from ui/skeleton.tsx.
 * Each skeleton mirrors the visual layout of the real content to minimise CLS (AC12).
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ── Dashboard ────────────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Hero card */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insight card */}
        <Card className="border-border/50 bg-card/50 lg:col-span-1">
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-9 w-32 mt-2" />
          </CardContent>
        </Card>

        {/* Chart */}
        <div className="lg:col-span-2 h-[200px]">
          <Card className="border-border/50 bg-card/50 h-full">
            <CardContent className="pt-6 h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>

        {/* Last matches */}
        <Card className="border-border/50 bg-card/50 lg:col-span-1 h-[200px]">
          <CardContent className="pt-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Deck Card ────────────────────────────────────────────────────────────────

export function DeckCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="pt-6">
        <div className="animate-pulse space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="w-10 h-10 rounded" />
            ))}
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DecksPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tab bar + arena selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-9 w-[200px] rounded-md" />
      </div>

      {/* Deck cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <DeckCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ── Community / Rankings ─────────────────────────────────────────────────────

export function RankingRowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-10 rounded" />
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="space-y-1 text-right">
        <Skeleton className="h-4 w-12 ml-auto" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
    </div>
  );
}

export function CommunitySkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Skeleton className="h-10 w-full max-w-[520px] rounded-lg" />

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <RankingRowSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Profile / Me ─────────────────────────────────────────────────────────────

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <Skeleton className="w-16 h-16 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />

      {/* Tab content */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50 bg-card/50">
            <CardContent className="pt-6 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Generic content skeleton ─────────────────────────────────────────────────

export function ContentSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="border-border/50 bg-card/50">
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
