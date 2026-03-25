import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatsCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

export function ClientCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-1.5 w-full mt-2" />
        </div>
      </div>
    </div>
  );
}

export function RecentClientSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-muted/20 backdrop-blur-sm border border-border/30">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-1 w-full mt-3" />
          <div className="flex justify-between mt-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuickActionSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 backdrop-blur-sm border border-border/30">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-4 w-4" />
    </div>
  );
}

export function FunnelColumnSkeleton() {
  return (
    <div className="w-72 md:w-80 flex flex-col">
      <div className="p-4 rounded-t-xl bg-muted">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-8 ml-auto rounded-full" />
        </div>
        <Skeleton className="h-3 w-40 mt-2" />
      </div>
      <div className="flex-1 bg-muted/20 backdrop-blur-sm rounded-b-xl p-3 space-y-3 min-h-[400px] border border-t-0 border-border/30">
        {[1, 2, 3].map((i) => (
          <ClientCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ClientListSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Skeleton className="h-10 flex-1 md:max-w-2xl" />
        <Skeleton className="h-10 w-full md:w-56" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="border-b border-border bg-muted/50 px-6 py-4">
            <div className="flex gap-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 w-16 rounded-full" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Funnel Overview */}
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg p-4 md:p-6 blur-[2px] animate-pulse">
        <div className="flex justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 md:h-32 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg p-4 md:p-6 blur-[2px] animate-pulse">
          <div className="flex justify-between mb-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <RecentClientSkeleton key={i} />
            ))}
          </div>
        </div>
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg p-4 md:p-6 blur-[2px] animate-pulse">
          <Skeleton className="h-5 w-32 mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <QuickActionSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SalesFunnelSkeleton() {
  return (
    <div className="p-4 md:p-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 md:gap-4 pb-4 min-w-max">
          {[1, 2, 3].map((i) => (
            <FunnelColumnSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
