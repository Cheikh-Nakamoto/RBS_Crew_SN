'use client';

import { MediaUpload } from './media-upload';

interface GalleryUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  className?: string;
}

export function GalleryUpload({ value = [], onChange, className }: GalleryUploadProps) {
  const handleSlotChange = (index: number, newUrl: string | undefined) => {
    const newGallery = [...value];
    if (newUrl === undefined) {
      newGallery.splice(index, 1);
    } else {
      newGallery[index] = newUrl;
    }
    onChange(newGallery);
  };

  const handleAdd = (newUrl: string | undefined) => {
    if (newUrl) {
      onChange([...value, newUrl]);
    }
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className || ''}`}>
      {value.map((url, index) => (
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
