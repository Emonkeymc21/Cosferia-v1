import type { MetadataRoute } from 'next';

/**
 * Manifest PWA generado por Next.js.
 * Se sirve en /manifest.webmanifest sin necesidad de un archivo estatico.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cosferia — Marketplace de cosplay',
    short_name: 'Cosferia',
    description: 'Compra y vende cosplay hecho a mano en Mendoza.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D0E12',
    theme_color: '#0D0E12',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
