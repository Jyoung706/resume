import { BrowserWindowConstructorOptions } from "electron";

type SupportedPlatform = Extract<NodeJS.Platform, "darwin" | "win32" | "linux">;

const platformConfigs: Record<
  SupportedPlatform,
  BrowserWindowConstructorOptions
> = {
  darwin: {
    titleBarStyle: "hiddenInset",
    titleBarOverlay: false,
    autoHideMenuBar: false,
  },
  win32: {
    titleBarStyle: "default",
    titleBarOverlay: false,
    autoHideMenuBar: true,
  },
  linux: {
    titleBarStyle: "default",
    titleBarOverlay: false,
    autoHideMenuBar: true,
  },
};

export const getPlatformConfig = (): BrowserWindowConstructorOptions => {
  const platform = process.platform;
  if (platform in platformConfigs) {
    return platformConfigs[platform as SupportedPlatform];
  }
  return platformConfigs.linux;
};
