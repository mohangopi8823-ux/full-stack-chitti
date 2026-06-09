import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const BACKUP_BUCKET = "excel-backups";
const BACKUP_PREFIX = "old-orders";
const RETENTION_DAYS = 30;
const ORDER_ITEM_DELETE_CHUNK_SIZE = 500;
const ORDER_DELETE_CHUNK_SIZE = 500;

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const envRoots = [
  path.resolve(process.cwd(), "backend"),
  process.cwd(),
  path.resolve(moduleDir, "../.."),
];

for (const root of envRoots.filter((value, index, roots) => roots.indexOf(value) === index)) {
  dotenv.config({ path: path.resolve(root, ".env.local") });
  dotenv.config({ path: path.resolve(root, ".env") });
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getCutoffDate() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  return cutoff;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function createBackupWorkbook(orders, orderItems) {
  const workbook = XLSX.utils.book_new();
  const ordersSheet = XLSX.utils.json_to_sheet(orders);
  const orderItemsSheet = XLSX.utils.json_to_sheet(orderItems);

  XLSX.utils.book_append_sheet(workbook, ordersSheet, "orders");
  XLSX.utils.book_append_sheet(workbook, orderItemsSheet, "orderItems");

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
}

function createBackupPath(cutoffDate) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const cutoff = cutoffDate.toISOString().slice(0, 10);
  return `${BACKUP_PREFIX}/orders-before-${cutoff}-${timestamp}.xlsx`;
}

async function fetchOldOrders(supabase, cutoffIso) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .lt("createdAt", cutoffIso)
    .order("createdAt", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch old orders: ${error.message}`);
  }

  return data ?? [];
}

async function fetchRelatedOrderItems(supabase, orderIds) {
  if (orderIds.length === 0) return [];

  const rows = [];
  for (const ids of chunkArray(orderIds, ORDER_ITEM_DELETE_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("orderItems")
      .select("*")
      .in("orderId", ids)
      .order("orderId", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch related orderItems: ${error.message}`);
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

async function uploadBackup(supabase, filePath, workbookBuffer) {
  const { data, error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(filePath, workbookBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload Excel backup to Supabase Storage: ${error.message}`);
  }

  return data;
}

async function deleteBackedUpOrders(supabase, orderIds) {
  let deletedOrderItems = 0;
  let deletedOrders = 0;

  for (const ids of chunkArray(orderIds, ORDER_ITEM_DELETE_CHUNK_SIZE)) {
    const { error, count } = await supabase
      .from("orderItems")
      .delete({ count: "exact" })
      .in("orderId", ids);

    if (error) {
      throw new Error(`Failed to delete backed-up orderItems: ${error.message}`);
    }

    deletedOrderItems += count ?? 0;
  }

  for (const ids of chunkArray(orderIds, ORDER_DELETE_CHUNK_SIZE)) {
    const { error, count } = await supabase
      .from("orders")
      .delete({ count: "exact" })
      .in("id", ids);

    if (error) {
      throw new Error(`Failed to delete backed-up orders: ${error.message}`);
    }

    deletedOrders += count ?? 0;
  }

  return { deletedOrderItems, deletedOrders };
}

export async function backupOldOrders({ deleteAfterBackup = false, trigger = "manual" } = {}) {
  const startedAt = new Date();
  const cutoffDate = getCutoffDate();
  const cutoffIso = cutoffDate.toISOString();

  console.log(`[Old Orders Backup] Starting ${trigger} run. deleteAfterBackup=${deleteAfterBackup}. cutoff=${cutoffIso}`);

  const supabase = getSupabaseAdminClient();
  const orders = await fetchOldOrders(supabase, cutoffIso);
  const orderIds = orders.map((order) => order.id).filter((id) => id !== undefined && id !== null);

  if (orders.length === 0) {
    console.log("[Old Orders Backup] No orders older than 30 days found. Nothing to upload or delete.");
    return {
      success: true,
      trigger,
      cutoffIso,
      ordersBackedUp: 0,
      orderItemsBackedUp: 0,
      backupPath: null,
      deleted: false,
      deletedOrders: 0,
      deletedOrderItems: 0,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
    };
  }

  const orderItems = await fetchRelatedOrderItems(supabase, orderIds);
  console.log(`[Old Orders Backup] Fetched ${orders.length} orders and ${orderItems.length} orderItems.`);

  const workbookBuffer = createBackupWorkbook(orders, orderItems);
  const backupPath = createBackupPath(cutoffDate);
  await uploadBackup(supabase, backupPath, workbookBuffer);
  console.log(`[Old Orders Backup] Uploaded Excel backup to bucket ${BACKUP_BUCKET}: ${backupPath}`);

  let deletedOrders = 0;
  let deletedOrderItems = 0;

  if (deleteAfterBackup) {
    console.log("[Old Orders Backup] Upload succeeded. Deleting orderItems first, then orders.");
    const deleteResult = await deleteBackedUpOrders(supabase, orderIds);
    deletedOrders = deleteResult.deletedOrders;
    deletedOrderItems = deleteResult.deletedOrderItems;
    console.log(`[Old Orders Backup] Deleted ${deletedOrderItems} orderItems and ${deletedOrders} orders.`);
  } else {
    console.log("[Old Orders Backup] Backup-only run complete. No rows deleted.");
  }

  return {
    success: true,
    trigger,
    cutoffIso,
    ordersBackedUp: orders.length,
    orderItemsBackedUp: orderItems.length,
    backupPath,
    deleted: deleteAfterBackup,
    deletedOrders,
    deletedOrderItems,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  };
}

export async function backupOldOrdersAndDelete(options = {}) {
  return backupOldOrders(options);
}
