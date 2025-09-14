import { createClient, Client, Row } from "@libsql/client";
import * as crypto from "crypto";
import bcrypt from "bcryptjs";
import path from "path";
import os from "os";
import dotenv from "dotenv";

dotenv.config();

/* =========================
   Interfaces
========================= */
export interface User {
  id: number;
  email: string;
  role: "admin" | "sales_person";
  created_at: string;
}

export interface Session {
  token: string;
  userId: number;
  role: "admin" | "sales_person";
  expiresAt: number;
}

export interface ReceiptProduct {
  productName: string;
  price: number;
  quantity: number;
  size?: string;
  product_code?: string;
}

export interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  tax_rate: number;
}

export interface ManualReceipt {
  id: number;
  sales_person_id: number;
  name: string;
  weight: number;
  sg: number;
  gold_karat: string;
  amount: number;
  transaction_code: string;
  created_at: string;
  sales_person?: string; // for joining with users table
}

/* =========================
   DB Client & Mode
========================= */
let db: Client;
let dbMode: "offline" | "online" | "auto" = "auto";

const LOCAL_DB_PATH =
  process.env.LOCAL_DB_PATH || path.join(os.homedir(), "product_receipt_local.db");
const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN;

dbMode = (process.env.DB_MODE as typeof dbMode) || "auto";

async function initDbClient(): Promise<Client> {
  if (dbMode === "offline" || (dbMode === "auto" && !TURSO_DB_URL)) {
    db = createClient({ url: `file:${LOCAL_DB_PATH}` });
    console.log("📂 Using LOCAL SQLite database:", LOCAL_DB_PATH);
  } else {
    try {
      if (!TURSO_DB_URL) throw new Error("TURSO_DB_URL missing!");
      db = createClient({ url: TURSO_DB_URL, authToken: TURSO_DB_TOKEN });
      console.log("☁️ Using ONLINE Turso database:", TURSO_DB_URL);
    } catch (err) {
      console.error("❌ Failed to connect to Turso, falling back to local DB:", err);
      db = createClient({ url: `file:${LOCAL_DB_PATH}` });
      console.log("📂 Using LOCAL SQLite database:", LOCAL_DB_PATH);
    }
  }
  return db;
}

export async function getActiveDb(): Promise<Client> {
  if (!db) await initDbClient();
  return db;
}

/* =========================
   Queue/Execute for Offline Sync
========================= */
async function queueOrExecute(
  table: string,
  operation: "INSERT" | "UPDATE" | "DELETE",
  sql: string,
  params: any[]
) {
  const dbClient = await getActiveDb();
  // Always execute the command on the active DB (local in offline mode)
  await dbClient.execute({ sql, args: params });

  // If in offline mode, also log it for future sync
  if (dbMode === "offline") {
    await dbClient.execute({
      sql: `INSERT INTO sync_log (table_name, operation, payload) VALUES (?, ?, ?)`,
      args: [table, operation, JSON.stringify({ sql, params })],
    });
  }
}

/* =========================
   Initialize Database
========================= */
export async function initDB() {
  const dbClient = await getActiveDb();
  console.log("Initializing database...");

  /* Users */
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'sales_person')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  /* Sessions */
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      role TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  /* Receipts */
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_person_id INTEGER NOT NULL,
      total REAL NOT NULL,
      items_json TEXT NOT NULL,
      transaction_code TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sales_person_id) REFERENCES users(id)
    );
  `);

  /* Manual Receipts */
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS manual_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_person_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      weight REAL NOT NULL,
      sg REAL NOT NULL,
      gold_karat TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_code TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sales_person_id) REFERENCES users(id)
    );
  `);

  /* Products */
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      product_code TEXT UNIQUE,
      price REAL NOT NULL,
      size_options TEXT,
      type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  /* Printer Settings */
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS printer_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      type TEXT NOT NULL,
      connectionType TEXT NOT NULL,
      interface TEXT NOT NULL
    );
  `);

  /* Company Profile */
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS company_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 0
    );
  `);

  /* Sync Log */
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  /* Ensure default admin exists */
  const adminEmail = "admin@gmail.com";
  const adminPassword = "admin@08166";
  const existingAdmin = await dbClient.execute("SELECT * FROM users WHERE email = ?", [
    adminEmail,
  ]);
  if (existingAdmin.rows.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await dbClient.execute(
      "INSERT INTO users (email, passwordHash, role) VALUES (?, ?, ?)",
      [adminEmail, hash, "admin"]
    );
    console.log(`✅ Default admin created: ${adminEmail} / ${adminPassword}`);
  }

  console.log("✅ Database initialization complete.");
}

/* =========================
   Sync with Remote
========================= */
export async function syncWithRemote(remoteDb: Client) {
  if (dbMode === "offline") return;

  const dbClient = await getActiveDb();
  const unsynced = await dbClient.execute("SELECT * FROM sync_log WHERE synced = 0");
  for (const row of unsynced.rows) {
    const payload = JSON.parse(row.payload as string);
    try {
      await remoteDb.execute({ sql: payload.sql, args: payload.params });
      await dbClient.execute("UPDATE sync_log SET synced = 1 WHERE id = ?", [row.id]);
      console.log(`✅ Synced ${row.table_name} row`);
    } catch (err) {
      console.error("❌ Sync failed:", err);
    }
  }
}

/* =========================
   Sessions
========================= */
export async function saveSession(
  token: string,
  userId: number,
  role: "admin" | "sales_person",
  expiresAt: number
) {
  await queueOrExecute(
    "sessions",
    "INSERT",
    "INSERT OR IGNORE INTO sessions (token, userId, role, expiresAt) VALUES (?, ?, ?, ?)",
    [token, userId, role, expiresAt]
  );
}

export async function getSession(token: string): Promise<Session | null> {
  const dbClient = await getActiveDb();
  const result = await dbClient.execute("SELECT * FROM sessions WHERE token = ? AND expiresAt > ?", [
    token,
    Date.now(),
  ]);
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      token: (row.token as string) ?? "",
      userId: Number(row.userId ?? 0),
      role: (row.role as "admin" | "sales_person") ?? "sales_person",
      expiresAt: Number(row.expiresAt ?? 0),
    };
  }
  return null;
}

export async function deleteSession(token: string) {
  const dbClient = await getActiveDb();
  await dbClient.execute("DELETE FROM sessions WHERE token = ?", [token]);
}

export async function cleanExpiredSessions() {
  const dbClient = await getActiveDb();
  await dbClient.execute("DELETE FROM sessions WHERE expiresAt <= ?", [Date.now()]);
}

export async function getAllActiveSessions(): Promise<Session[]> {
  const dbClient = await getActiveDb();
  const result = await dbClient.execute("SELECT * FROM sessions WHERE expiresAt > ?", [Date.now()]);
  return result.rows.map((row) => ({
    token: (row.token as string) ?? "",
    userId: Number(row.userId ?? 0),
    role: (row.role as "admin" | "sales_person") ?? "sales_person",
    expiresAt: Number(row.expiresAt ?? 0),
  }));
}

/* =========================
   Users
========================= */
export async function createUser(email: string, password: string, role: "admin" | "sales_person") {
  const dbClient = await getActiveDb();
  const hash = await bcrypt.hash(password, 10);
  await queueOrExecute(
    "users", 
    "INSERT", 
    "INSERT OR IGNORE INTO users (email, passwordHash, role) VALUES (?, ?, ?)", 
    [
    email,
    hash,
    role,
  ]);
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const dbClient = await getActiveDb();
  const result = await dbClient.execute("SELECT * FROM users WHERE email = ?", [email]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const passwordHash = row.passwordHash as string;
  const match = await bcrypt.compare(password, passwordHash);
  if (!match) return null;

  return {
    id: Number(row.id ?? 0),
    email: (row.email as string) ?? "",
    role: (row.role as "admin" | "sales_person") ?? "sales_person",
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  };
}

export async function getAllUsers(): Promise<User[]> {
  const dbClient = await getActiveDb();
  const result = await dbClient.execute("SELECT id, email, role, created_at FROM users");
  return result.rows.map((row) => ({
    id: Number(row.id ?? 0),
    email: (row.email as string) ?? "",
    role: (row.role as "admin" | "sales_person") ?? "sales_person",
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  }));
}

export async function getUserById(id: number): Promise<User | null> {
  const dbClient = await getActiveDb();
  const result = await dbClient.execute("SELECT * FROM users WHERE id = ?", [id]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: Number(row.id ?? 0),
    email: (row.email as string) ?? "",
    role: (row.role as "admin" | "sales_person") ?? "sales_person",
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  };
}

export async function updateUser(id: number, email: string, role: "admin" | "sales_person") {
  const dbClient = await getActiveDb();
  await dbClient.execute("UPDATE users SET email = ?, role = ? WHERE id = ?", [email, role, id]);
}

export async function deleteUser(id: number) {
  const dbClient = await getActiveDb();
  await dbClient.execute("DELETE FROM users WHERE id = ?", [id]);
}

/* =========================
   Receipts
========================= */
export async function createReceipt(
  salesPersonId: number,
  total: number,
  items: ReceiptProduct[]
) {
  const dbClient = await getActiveDb();
  const processedItems = Array.isArray(items) ? items : [];
  const calculatedTotal =
    total || processedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let companyPrefix = "GEN";
  const companyProfile = await getCompanyProfile();
  if (companyProfile?.name && companyProfile.name.length >= 3) {
    companyPrefix = companyProfile.name.substring(0, 3).toUpperCase();
  }

  const transactionCode = `trans-${companyPrefix}-${crypto.randomUUID().substring(0, 7)}`;

  await queueOrExecute(
    "receipts",
    "INSERT",
    "INSERT OR IGNORE INTO receipts (sales_person_id, total, items_json, transaction_code) VALUES (?, ?, ?, ?)",
    [salesPersonId, calculatedTotal, JSON.stringify(processedItems), transactionCode]
  );
}
export async function getReceiptsBySalesPerson(salesPersonId: number) {
  const dbClient = await getActiveDb();
  const result = await dbClient.execute(
    `SELECT r.id, r.total, r.items_json, r.created_at, r.transaction_code, u.email AS sales_person
     FROM receipts r
     JOIN users u ON r.sales_person_id = u.id
     WHERE r.sales_person_id = ?
     ORDER BY r.created_at DESC`,
    [salesPersonId]
  );

  return result.rows.map((row) => ({
    id: Number(row.id ?? 0),
    total: Number(row.total ?? 0),
    sales_person: (row.sales_person as string) ?? "",
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    transaction_code: (row.transaction_code as string) ?? "",
    items: JSON.parse((row.items_json as string) ?? "[]") as ReceiptProduct[],
  }));
}

export async function getAllReceipts() {
  const dbClient = await getActiveDb();
  const result = await dbClient.execute(
    `SELECT r.id, r.total, r.items_json, r.created_at, r.transaction_code, u.email AS sales_person
     FROM receipts r
     JOIN users u ON r.sales_person_id = u.id
     ORDER BY r.created_at DESC`
  );

  return result.rows.map((row) => ({
    id: Number(row.id ?? 0),
    total: Number(row.total ?? 0),
    sales_person: (row.sales_person as string) ?? "",
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    transaction_code: (row.transaction_code as string) ?? "",
    items: JSON.parse((row.items_json as string) ?? "[]") as ReceiptProduct[],
  }));
}

export async function searchReceipts(
  startDate?: string,
  endDate?: string,
  productName?: string,
  salesPersonId?: number
) {
  const dbClient = await getActiveDb();

  let query = `
    SELECT r.id, r.total, r.items_json, r.created_at, r.transaction_code, u.email AS sales_person
    FROM receipts r
    JOIN users u ON r.sales_person_id = u.id
    WHERE 1=1
  `;
  const args: any[] = [];

  if (startDate) {
    query += " AND r.created_at >= ?";
    args.push(startDate);
  }
  if (endDate) {
    query += " AND r.created_at <= ?";
    args.push(endDate);
  }
  if (productName) {
    query += " AND r.items_json LIKE ?";
    args.push(`%${productName}%`);
  }
  if (salesPersonId) {
    query += " AND r.sales_person_id = ?";
    args.push(salesPersonId);
  }

  query += " ORDER BY r.created_at DESC";

  const result = await dbClient.execute(query, args);

  return result.rows.map((row) => ({
    id: Number(row.id ?? 0),
    total: Number(row.total ?? 0),
    sales_person: (row.sales_person as string) ?? "",
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    transaction_code: (row.transaction_code as string) ?? "",
    items: JSON.parse((row.items_json as string) ?? "[]") as ReceiptProduct[],
  }))
}

/* =========================
   Manual Receipts
========================= */

export async function createManualReceipt(
  salesPersonId: number,
  name: string,
  weight: number,
  sg: number,
  goldKarat: string,
  amount: number
): Promise<string> {
  const dbClient = await getActiveDb();
  
  let companyPrefix = "MAN";
  const companyProfile = await getCompanyProfile();
  if (companyProfile?.name && companyProfile.name.length >= 3) {
    companyPrefix = companyProfile.name.substring(0, 3).toUpperCase();
  }

  const transactionCode = `trans-${companyPrefix}-${crypto.randomUUID().substring(0, 7)}`;

  await queueOrExecute(
    "manual_receipts",
    "INSERT",
    "INSERT INTO manual_receipts (sales_person_id, name, weight, sg, gold_karat, amount, transaction_code) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [salesPersonId, name, weight, sg, goldKarat, amount, transactionCode]
  );

  return transactionCode;
}

export async function getAllManualReceipts(
  limit?: number,
  offset?: number
): Promise<{ receipts: ManualReceipt[]; totalCount: number }> {
  const dbClient = await getActiveDb();

  let query = `
    SELECT mr.*, u.email as sales_person
    FROM manual_receipts mr
    JOIN users u ON mr.sales_person_id = u.id
    ORDER BY mr.created_at DESC
  `;

  // Get total count
  const countResult = await dbClient.execute(`
    SELECT COUNT(*) as count
    FROM manual_receipts
  `);
  const totalCount = Number(countResult.rows[0].count ?? 0);

  // Add limit and offset
  query += ` LIMIT ? OFFSET ?`;
  const args: any[] = [limit, offset];

  const result = await dbClient.execute(query, args);

  const receipts = result.rows.map((row) => ({
    id: Number(row.id ?? 0),
    sales_person_id: Number(row.sales_person_id ?? 0),
    name: (row.name as string) ?? "",
    weight: Number(row.weight ?? 0),
    sg: Number(row.sg ?? 0),
    gold_karat: (row.gold_karat as string) ?? "",
    amount: Number(row.amount ?? 0),
    transaction_code: (row.transaction_code as string) ?? "",
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    sales_person: (row.sales_person as string) ?? "",
  }));

  return { receipts, totalCount };
}

export async function getDailyManualReceiptsBySalesPerson(
  salesPersonId: number,
  limit?: number,
  offset?: number
): Promise<{ receipts: ManualReceipt[]; totalCount: number }> {
  const dbClient = await getActiveDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let query = `
    SELECT mr.*, u.email as sales_person
    FROM manual_receipts mr
    JOIN users u ON mr.sales_person_id = u.id
    WHERE mr.sales_person_id = ? AND mr.created_at >= ? AND mr.created_at < ?
    ORDER BY mr.created_at DESC
  `;
  const args: any[] = [salesPersonId, today.toISOString(), tomorrow.toISOString()];

  // Get total count
  const countResult = await dbClient.execute(`
    SELECT COUNT(*) as count
    FROM manual_receipts mr
    WHERE mr.sales_person_id = ? AND mr.created_at >= ? AND mr.created_at < ?
  `, [salesPersonId, today.toISOString(), tomorrow.toISOString()]);
  const totalCount = Number(countResult.rows[0].count ?? 0);

  // Add limit and offset
  query += ` LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const result = await dbClient.execute(query, args);

  const receipts = result.rows.map((row) => ({
    id: Number(row.id ?? 0),
    sales_person_id: Number(row.sales_person_id ?? 0),
    name: (row.name as string) ?? "",
    weight: Number(row.weight ?? 0),
    sg: Number(row.sg ?? 0),
    gold_karat: (row.gold_karat as string) ?? "",
    amount: Number(row.amount ?? 0),
    transaction_code: (row.transaction_code as string) ?? "",
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    sales_person: (row.sales_person as string) ?? "",
  }));

  return { receipts, totalCount };
}

export async function searchManualReceipts(
  startDate?: string,
  endDate?: string,
  salesPersonId?: number,
  search?: { type: string; term: string },
  limit?: number,
  offset?: number
): Promise<{ receipts: ManualReceipt[]; totalCount: number }> {
  const dbClient = await getActiveDb();

  let query = `
    SELECT mr.*, u.email as sales_person
    FROM manual_receipts mr
    JOIN users u ON mr.sales_person_id = u.id
    WHERE 1=1
  `;
  const args: any[] = [];

  if (startDate) {
    query += " AND mr.created_at >= ?";
    args.push(startDate);
  }
  if (endDate) {
    query += " AND mr.created_at <= ?";
    args.push(endDate);
  }
  if (salesPersonId) {
    query += " AND mr.sales_person_id = ?";
    args.push(salesPersonId);
  }
  if (search && search.term) {
    if (search.type === 'name' || search.type === 'transaction_code') {
      query += ` AND mr.${search.type} LIKE ?`;
      args.push(`%${search.term}%`);
    } else if (search.type === 'amount') {
      query += ` AND mr.amount = ?`;
      args.push(Number(search.term));
    }
  }

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as count
    FROM manual_receipts mr
    WHERE 1=1
  `;
  const countArgs: any[] = [];

  if (startDate) {
    countQuery += " AND mr.created_at >= ?";
    countArgs.push(startDate);
  }
  if (endDate) {
    countQuery += " AND mr.created_at <= ?";
    countArgs.push(endDate);
  }
  if (salesPersonId) {
    countQuery += " AND mr.sales_person_id = ?";
    countArgs.push(salesPersonId);
  }
  if (search && search.term) {
    if (search.type === 'name' || search.type === 'transaction_code') {
      countQuery += ` AND mr.${search.type} LIKE ?`;
      countArgs.push(`%${search.term}%`);
    } else if (search.type === 'amount') {
      countQuery += ` AND mr.amount = ?`;
      countArgs.push(Number(search.term));
    }
  }

  const countResult = await dbClient.execute(countQuery, countArgs);
  const totalCount = Number(countResult.rows[0].count ?? 0);

  query += " ORDER BY mr.created_at DESC";

  // Add limit and offset
  if (limit !== undefined && offset !== undefined) {
    query += ` LIMIT ? OFFSET ?`;
    args.push(limit, offset);
  }

  const result = await dbClient.execute(query, args);

  const receipts = result.rows.map((row) => ({
    id: Number(row.id ?? 0),
    sales_person_id: Number(row.sales_person_id ?? 0),
    name: (row.name as string) ?? "",
    weight: Number(row.weight ?? 0),
    sg: Number(row.sg ?? 0),
    gold_karat: (row.gold_karat as string) ?? "",
    amount: Number(row.amount ?? 0),
    transaction_code: (row.transaction_code as string) ?? "",
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    sales_person: (row.sales_person as string) ?? "",
  }));

  return { receipts, totalCount };
}
/* =========================
   Company Profile
========================= */
export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  const dbClient = await getActiveDb();
  const result = await dbClient.execute(
    "SELECT name, address, phone, tax_rate FROM company_profile WHERE id = 1"
  );
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      name: (row.name as string) ?? "",
      address: (row.address as string) ?? "",
      phone: (row.phone as string) ?? "",
      tax_rate: Number(row.tax_rate ?? 0),
    };
  }
  return null;
}

export async function updateCompanyProfile(profile: CompanyProfile) {
  await queueOrExecute(
    "company_profile",
    "INSERT",
    "INSERT INTO company_profile (id, name, address, phone, tax_rate) VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = ?, address = ?, phone = ?, tax_rate = ?",
    [profile.name, profile.address, profile.phone, profile.tax_rate, profile.name, profile.address, profile.phone, profile.tax_rate]
  );
}

/* =========================
   Products
========================= */
export async function createProduct(
  name: string,
  price: number,
  type: string,
  sizeOptions?: string[],
  productCode?: string
) {
  await queueOrExecute(
    "products",
    "INSERT",
    "INSERT OR IGNORE INTO products (name, product_code, price, size_options, type) VALUES (?, ?, ?, ?, ?)",
    [name, productCode || crypto.randomUUID(), price, sizeOptions?.join(",") || null, type]
  );
}

export async function getAllProducts() {
  const dbClient = await getActiveDb();
  const result = await dbClient.execute("SELECT * FROM products ORDER BY created_at DESC");
  return result.rows.map((row) => ({
    id: Number(row.id ?? 0),
    name: (row.name as string) ?? "",
    price: Number(row.price ?? 0),
    type: (row.type as string) ?? "",
    sizeOptions: (row.size_options as string)?.split(",") ?? [],
    productCode: (row.product_code as string) ?? "",
  }));
}

export async function updateProduct(
  id: number,
  name: string,
  price: number,
  type: string,
  sizeOptions?: string[]
) {
  const dbClient = await getActiveDb();
  await dbClient.execute(
    "UPDATE products SET name = ?, price = ?, type = ?, size_options = ? WHERE id = ?",
    [name, price, type, sizeOptions?.join(",") || null, id]
  );
}

export async function deleteProduct(id: number) {
  const dbClient = await getActiveDb();
  await dbClient.execute("DELETE FROM products WHERE id = ?", [id]);
}

/* =========================
   Printer Settings
========================= */
export async function getPrinterSettings() {
  const dbClient = await getActiveDb();
  const result = await dbClient.execute("SELECT * FROM printer_settings WHERE id = 1");
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function savePrinterSettings(type: string, connectionType: string, iface: string) {
  await queueOrExecute(
    "printer_settings",
    "INSERT",
    "INSERT INTO printer_settings (id, type, connectionType, interface) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET type = ?, connectionType = ?, interface = ?",
    [type, connectionType, iface, type, connectionType, iface]
  );
}
