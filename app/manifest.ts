import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

// Lets readers "install" the site on their phone's home screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name, short_name: 'Velkrypt', description: SITE.description,
    start_url: '/', display: 'standalone', background_color: '#0D1314', theme_color: '#13201E',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Latest news', url: '/' }, { name: 'Patch priority', url: '/patch-priority' }, { name: 'Learn', url: '/learn' },
    ],
  };
}
