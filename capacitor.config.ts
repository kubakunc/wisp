import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.velologiclabs.wisp',
  appName: 'Wisp',
  webDir: 'build',
  server: { androidScheme: 'https' }
};

export default config;
