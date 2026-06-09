export type BackupOldOrdersOptions = {
  deleteAfterBackup?: boolean;
  trigger?: "manual" | "cron" | string;
};

export type BackupOldOrdersResult = {
  success: true;
  trigger: string;
  cutoffIso: string;
  ordersBackedUp: number;
  orderItemsBackedUp: number;
  backupPath: string | null;
  deleted: boolean;
  deletedOrders: number;
  deletedOrderItems: number;
  startedAt: string;
  finishedAt: string;
};

export function backupOldOrders(options?: BackupOldOrdersOptions): Promise<BackupOldOrdersResult>;
export function backupOldOrdersAndDelete(options?: BackupOldOrdersOptions): Promise<BackupOldOrdersResult>;
