import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PublicNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="rounded-full bg-muted p-4">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold">Page introuvable</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          La page que vous recherchez n&apos;existe pas ou a été supprimée.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l&apos;accueil
        </Link>
      </Button>
    </div>
  );
}
