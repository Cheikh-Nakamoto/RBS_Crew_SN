import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="rounded-full bg-white/5 p-4">
        <FileQuestion className="h-8 w-8 text-white/40" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-white">Page introuvable</h1>
        <p className="text-sm text-white/50 max-w-md">
          La page que vous recherchez n&apos;existe pas ou a été supprimée.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au dashboard
        </Link>
      </Button>
    </div>
  );
}
