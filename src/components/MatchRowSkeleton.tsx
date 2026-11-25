export interface MatchRowSkeletonProps {
  count?: number;
  label?: string;
}

export function MatchRowSkeleton({
  count = 4,
  label = 'Loading matches',
}: MatchRowSkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="rounded-[10px] border border-[#2A3730] bg-[#121A16] px-4 py-3"
        >
          <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(150px,190px)_1fr_auto] md:items-center md:gap-4">
            <div className="flex items-center justify-between md:block">
              <div className="h-4 w-32 animate-pulse rounded bg-[#19231E]" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-[#19231E] md:hidden" />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="ml-auto h-5 w-28 animate-pulse rounded bg-[#19231E]" />
              <div className="h-[30px] w-[76px] animate-pulse rounded-[10px] bg-[#19231E]" />
              <div className="h-5 w-28 animate-pulse rounded bg-[#19231E]" />
            </div>
            <div className="hidden h-6 w-24 animate-pulse rounded-full bg-[#19231E] md:block" />
          </div>
        </div>
      ))}
    </div>
  );
}
