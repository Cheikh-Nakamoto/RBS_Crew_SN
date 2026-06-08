import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingUserDetail() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg bg-white/5" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32 bg-white/5" />
          <Skeleton className="h-7 w-48 bg-white/5" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-xl bg-white/5" />
      <Skeleton className="h-28 w-full rounded-xl bg-white/5" />
      <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
    </div>
  );
}
