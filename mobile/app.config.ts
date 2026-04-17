// Mobile app configuration for React Native
// File: mobile/app.config.ts

export default {
  expo: {
    name: 'Atlas Synapse CRM',
    slug: 'atlas-synapse-crm',
    version: '1.0.0',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTabletMode: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#0f172a',
      },
    },
    plugins: [
      [
        'expo-notifications',
        {
          icons: ['./assets/notification-icon.png'],
        },
      ],
    ],
    extra: {
      apiUrl: process.env.API_URL || 'https://atlas-synapse-crm.vercel.app',
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseKey: process.env.VITE_SUPABASE_ANON_KEY,
    },
  },
};
