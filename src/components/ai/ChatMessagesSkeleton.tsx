import { Skeleton } from "@/components/ui/skeleton";

export function ChatMessagesSkeleton() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-pulse">
      {/* Assistant message skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      {/* User message skeleton */}
      <div className="flex gap-3 justify-end">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      </div>

      {/* Another assistant message */}
      <div className="flex gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Another user message */}
      <div className="flex gap-3 justify-end">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      </div>

      {/* Final assistant message */}
      <div className="flex gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  );
}
