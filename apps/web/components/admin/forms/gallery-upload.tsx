'use client';

import { MediaUpload } from './media-upload';

interface GalleryUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  className?: string;
}

export function GalleryUpload({ value, onChange, className }: GalleryUploadProps) {
  const safeValue = Array.isArray(value) ? value : [];

  const handleSlotChange = (index: number, newUrl: string | undefined) => {
    const newGallery = [...safeValue];
    if (newUrl === undefined) {
      newGallery.splice(index, 1);
    } else {
      newGallery[index] = newUrl;
    }
    onChange(newGallery);
  };

  const handleAdd = (newUrl: string | undefined) => {
    if (newUrl) {
      onChange([...safeValue, newUrl]);
    }
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className || ''}`}>
      {safeValue.map((url, index) => (
        <MediaUpload
          key={`${url}-${index}`}
          value={url}
          onChange={(v) => handleSlotChange(index, v)}
          label={`Image ${index + 1}`}
        />
      ))}
      <MediaUpload
        value={undefined}
        onChange={handleAdd}
        label="Nouvelle image"
      />
    </div>
  );
}
