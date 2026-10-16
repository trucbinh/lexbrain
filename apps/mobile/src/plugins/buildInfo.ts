import { Capacitor, registerPlugin } from '@capacitor/core';

interface BuildInfoPlugin {
  getBuildInfo(): Promise<{ debugBuild: boolean }>;
}

export const BuildInfo = registerPlugin<BuildInfoPlugin>('BuildInfo', {
  web: () =>
    Promise.resolve<BuildInfoPlugin>({
      async getBuildInfo() {
        return { debugBuild: !Capacitor.isNativePlatform() || import.meta.env.DEV };
      },
    }),
});