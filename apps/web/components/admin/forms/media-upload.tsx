'use client';

import { useCallback, useState } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedUploadButton from '@/components/ui/animated-upload-button';

interface MediaUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  className?: string;
}

export function MediaUpload({ value, onChange, label = 'Image', className }: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>();

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Seules les images sont acceptées');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 10 Mo)');
      return;
    }

    setIsUploading(true);
    setError(undefined);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Erreur upload');
      const { url } = await res.json() as { url: string };
      onChange(url);
    } catch {
      setError('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  if (value) {
    return (
      <div className={cn('relative rounded-xl overflow-hidden border border-white/10 bg-white/5', className)}>
        <div className="relative aspect-video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer',
          isDragging
            ? 'border-[var(--rbs-red)] bg-[var(--rbs-red)]/10'
            : 'border-white/20 bg-white/3 hover:border-white/40 hover:bg-white/5',
          isUploading && 'opacity-60 cursor-wait'
        )}
        onClick={() => !isUploading && document.getElementById(`upload-${label}`)?.click()}
      >
        <input
          id={`upload-${label}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        <AnimatedUploadButton isUploading={isUploading} />
        <div>
          <p className="text-sm font-medium text-white/70">
            {isUploading ? 'Upload en cours...' : 'Glisser une image ici'}
          </p>
          <p className="text-xs text-white/30 mt-1">
            ou survolez le bouton pour parcourir · max 10 Mo
          </p>
        </div>
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[var(--rbs-red)]/5">
            <Upload className="h-8 w-8 text-[var(--rbs-red)]" />
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
