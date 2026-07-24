export interface SecurityStore {
  isBanned(ip: string): Promise<boolean>;
  setBan(ip: string): Promise<void>;
  record404(ip: string): Promise<{ hitThreshold: boolean }>;
}

export interface ReportRateStore {
  recordReport(ip: string): Promise<{ allowed: boolean }>;
}
