export interface AppInfo {
  appName: string
  version: string
}

export interface ElectronAPI {
  getAppInfo: () => Promise<AppInfo>
}