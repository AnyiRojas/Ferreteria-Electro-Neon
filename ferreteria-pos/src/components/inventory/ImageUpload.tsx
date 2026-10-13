'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, ImageIcon, CheckCircle } from 'lucide-react';
import { uploadProductImage } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  productId?: string;
}

// ─── Compresión en el navegador ───────────────────────────────────────────────
// Redimensiona a máx 800px y convierte a JPEG al 82% de calidad.
// Una foto de 4MB queda en ~80-150KB sin pérdida visual apreciable.
async function compressImage(file: File, maxPx = 800, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calcular nuevas dimensiones manteniendo proporción
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) {
          height = Math.round((height * maxPx) / width);
          width  = maxPx;
        } else {
          width  = Math.round((width * maxPx) / height);
          height = maxPx;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.jpg'),
            { type: 'image/jpeg' }
          );
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageUpload({
  value,
  onChange,
  productId = 'temp',
}: ImageUploadProps) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [uploading,    setUploading]    = useState(false);
  const [dragOver,     setDragOver]     = useState(false);
  const [progress,     setProgress]     = useState('');  // texto de estado
  const [savedInfo,    setSavedInfo]    = useState('');  // "4.2MB → 98KB"

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const originalSize = file.size;
    setUploading(true);
    setSavedInfo('');

    // 1. Comprimir
    setProgress('Comprimiendo…');
    const compressed = await compressImage(file);
    const compressedSize = compressed.size;

    // 2. Subir
    setProgress('Subiendo…');
    const url = await uploadProductImage(compressed, productId);

    setUploading(false);
    setProgress('');

    if (url) {
      onChange(url);
      if (originalSize > compressedSize) {
        setSavedInfo(`${formatBytes(originalSize)} → ${formatBytes(compressedSize)}`);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Imagen del producto
      </label>

      {value ? (
        <div className="relative h-40 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <Image
            src={value}
            alt="Producto"
            fill
            className="object-contain p-2"
          />
          <button
            type="button"
            onClick={() => { onChange(''); setSavedInfo(''); }}
            className="absolute right-2 top-2 rounded-full bg-white p-1 shadow-md hover:bg-red-50"
          >
            <X className="h-4 w-4 text-red-500" />
          </button>
          {savedInfo && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-green-600/90 px-2 py-0.5 text-xs text-white">
              <CheckCircle className="h-3 w-3" />
              {savedInfo}
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
            dragOver
              ? 'border-orange-400 bg-orange-50'
              : 'border-gray-300 bg-gray-50 hover:border-orange-300 hover:bg-orange-50'
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <p className="text-xs font-medium text-orange-500">{progress}</p>
            </div>
          ) : (
            <>
              <div className="mb-2 rounded-full bg-orange-100 p-3">
                {dragOver
                  ? <Upload    className="h-6 w-6 text-orange-500" />
                  : <ImageIcon className="h-6 w-6 text-orange-400" />
                }
              </div>
              <p className="text-sm font-medium text-gray-600">
                {dragOver ? 'Suelta la imagen' : 'Haz clic o arrastra una imagen'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PNG · JPG · WebP · cualquier tamaño — se comprime automáticamente
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
