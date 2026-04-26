import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ProgressGym',
        short_name: 'ProgressGym',
        description: 'App de entrenamiento para entrenadores personales',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#09090b',
        orientation: 'portrait',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
