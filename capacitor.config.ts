import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.captureyourwork.app',
  appName: 'PhotoDoc',
  server: {
    // Debug-only: point at local dev server. Revert to
    // https://app.captureyourwork.com/m before any shipped build.
    url: 'http://localhost:3000/login',
    cleartext: true,
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
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
