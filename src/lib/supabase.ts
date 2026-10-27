import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Storage helpers ──────────────────────────────────────────────────────────

export const STORAGE_BUCKET = 'product-images';

/**
 * Upload a product image to Supabase Storage.
 * Returns the public URL on success, null on failure.
 */
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${productId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('Error uploading image:', error.message);
    return null;
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a product image from Supabase Storage given its public URL.
 */
export async function deleteProductImage(publicUrl: string): Promise<void> {
  // Extract path after "/object/public/<bucket>/"
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}
