import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingProductEdit() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg bg-white/5" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-48 bg-white/5" />
          <Skeleton className="h-3 w-32 bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
