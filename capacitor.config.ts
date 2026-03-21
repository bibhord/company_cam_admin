import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.captureyourwork.app',
  appName: 'PhotoDoc',
  // Point to your Vercel deployment URL.
  // Change this to your custom domain later (e.g., https://app.captureyourwork.com/m)
  server: {
    url: 'https://company-cam-admin-zsvs.vercel.app/m',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'PhotoDoc',
    backgroundColor: '#F8FAFC',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#F59E0B',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F59E0B',
    },
  },
};

export default config;
