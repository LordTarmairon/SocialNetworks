// Filtros de foto estilo Instagram. El `css` se usa tanto para la vista previa
// (style.filter) como para el render final en canvas (ctx.filter).
export interface PhotoFilter {
  id: string;
  label: string;
  css: string;
}

export const PHOTO_FILTERS: PhotoFilter[] = [
  { id: 'normal', label: 'Normal', css: 'none' },
  { id: 'bn', label: 'B/N', css: 'grayscale(1)' },
  { id: 'sepia', label: 'Sepia', css: 'sepia(0.8)' },
  {
    id: 'vintage',
    label: 'Vintage',
    css: 'sepia(0.4) contrast(1.1) brightness(1.05) saturate(1.3)',
  },
  { id: 'frio', label: 'Frío', css: 'hue-rotate(-12deg) saturate(1.2) brightness(1.05)' },
  { id: 'calido', label: 'Cálido', css: 'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { id: 'vivido', label: 'Vívido', css: 'saturate(1.8) contrast(1.1)' },
  { id: 'nitido', label: 'Nítido', css: 'contrast(1.3) brightness(1.05)' },
];

/** Aplica un filtro CSS a un File de imagen y devuelve un Blob (JPEG). */
export function applyFilter(file: File, css: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen'));
        return;
      }
      ctx.filter = css === 'none' ? 'none' : css;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob falló'))),
        'image/jpeg',
        0.9,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };
    img.src = url;
  });
}
