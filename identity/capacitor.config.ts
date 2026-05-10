import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.identity.app',
  appName: 'Mark Identity',
  webDir: 'build',
  android: {
    allowMixedContent: true,
    backgroundColor: '#0c1410',
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0c1410',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
