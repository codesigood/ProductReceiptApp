"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveDb = getActiveDb;
exports.initDB = initDB;
exports.syncWithRemote = syncWithRemote;
exports.saveSession = saveSession;
exports.getSession = getSession;
exports.deleteSession = deleteSession;
exports.cleanExpiredSessions = cleanExpiredSessions;
exports.getAllActiveSessions = getAllActiveSessions;
exports.createUser = createUser;
exports.authenticateUser = authenticateUser;
exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.createReceipt = createReceipt;
exports.getReceiptsBySalesPerson = getReceiptsBySalesPerson;
exports.getAllReceipts = getAllReceipts;
exports.searchReceipts = searchReceipts;
exports.createManualReceipt = createManualReceipt;
exports.getAllManualReceipts = getAllManualReceipts;
exports.getDailyManualReceiptsBySalesPerson = getDailyManualReceiptsBySalesPerson;
exports.searchManualReceipts = searchManualReceipts;
exports.getCompanyProfile = getCompanyProfile;
exports.updateCompanyProfile = updateCompanyProfile;
exports.createProduct = createProduct;
exports.getAllProducts = getAllProducts;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.getPrinterSettings = getPrinterSettings;
exports.savePrinterSettings = savePrinterSettings;
const client_1 = require("@libsql/client");
const crypto = __importStar(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/* =========================
   DB Client & Mode
========================= */
let db;
let dbMode = "auto";
const LOCAL_DB_PATH = process.env.LOCAL_DB_PATH || path_1.default.join(os_1.default.homedir(), "product_receipt_local.db");
const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN;
dbMode = process.env.DB_MODE || "auto";
async function initDbClient() {
    if (dbMode === "offline" || (dbMode === "auto" && !TURSO_DB_URL)) {
        db = (0, client_1.createClient)({ url: `file:${LOCAL_DB_PATH}` });
        console.log("📂 Using LOCAL SQLite database:", LOCAL_DB_PATH);
    }
    else {
        try {
            if (!TURSO_DB_URL)
                throw new Error("TURSO_DB_URL missing!");
            db = (0, client_1.createClient)({ url: TURSO_DB_URL, authToken: TURSO_DB_TOKEN });
            console.log("☁️ Using ONLINE Turso database:", TURSO_DB_URL);
        }
        catch (err) {
            console.error("❌ Failed to connect to Turso, falling back to local DB:", err);
            db = (0, client_1.createClient)({ url: `file:${LOCAL_DB_PATH}` });
            console.log("📂 Using LOCAL SQLite database:", LOCAL_DB_PATH);
        }
    }
    return db;
}
async function getActiveDb() {
    if (!db)
        await initDbClient();
    return db;
}
/* =========================
   Queue/Execute for Offline Sync
========================= */
async function queueOrExecute(table, operation, sql, params) {
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
async function initDB() {
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
        const hash = await bcryptjs_1.default.hash(adminPassword, 10);
        await dbClient.execute("INSERT INTO users (email, passwordHash, role) VALUES (?, ?, ?)", [adminEmail, hash, "admin"]);
        console.log(`✅ Default admin created: ${adminEmail} / ${adminPassword}`);
    }
    console.log("✅ Database initialization complete.");
}
/* =========================
   Sync with Remote
========================= */
async function syncWithRemote(remoteDb) {
    if (dbMode === "offline")
        return;
    const dbClient = await getActiveDb();
    const unsynced = await dbClient.execute("SELECT * FROM sync_log WHERE synced = 0");
    for (const row of unsynced.rows) {
        const payload = JSON.parse(row.payload);
        try {
            await remoteDb.execute({ sql: payload.sql, args: payload.params });
            await dbClient.execute("UPDATE sync_log SET synced = 1 WHERE id = ?", [row.id]);
            console.log(`✅ Synced ${row.table_name} row`);
        }
        catch (err) {
            console.error("❌ Sync failed:", err);
        }
    }
}
/* =========================
   Sessions
========================= */
async function saveSession(token, userId, role, expiresAt) {
    await queueOrExecute("sessions", "INSERT", "INSERT OR IGNORE INTO sessions (token, userId, role, expiresAt) VALUES (?, ?, ?, ?)", [token, userId, role, expiresAt]);
}
async function getSession(token) {
    const dbClient = await getActiveDb();
    const result = await dbClient.execute("SELECT * FROM sessions WHERE token = ? AND expiresAt > ?", [
        token,
        Date.now(),
    ]);
    if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
            token: row.token ?? "",
            userId: Number(row.userId ?? 0),
            role: row.role ?? "sales_person",
            expiresAt: Number(row.expiresAt ?? 0),
        };
    }
    return null;
}
async function deleteSession(token) {
    const dbClient = await getActiveDb();
    await dbClient.execute("DELETE FROM sessions WHERE token = ?", [token]);
}
async function cleanExpiredSessions() {
    const dbClient = await getActiveDb();
    await dbClient.execute("DELETE FROM sessions WHERE expiresAt <= ?", [Date.now()]);
}
async function getAllActiveSessions() {
    const dbClient = await getActiveDb();
    const result = await dbClient.execute("SELECT * FROM sessions WHERE expiresAt > ?", [Date.now()]);
    return result.rows.map((row) => ({
        token: row.token ?? "",
        userId: Number(row.userId ?? 0),
        role: row.role ?? "sales_person",
        expiresAt: Number(row.expiresAt ?? 0),
    }));
}
/* =========================
   Users
========================= */
async function createUser(email, password, role) {
    const dbClient = await getActiveDb();
    const hash = await bcryptjs_1.default.hash(password, 10);
    await queueOrExecute("users", "INSERT", "INSERT OR IGNORE INTO users (email, passwordHash, role) VALUES (?, ?, ?)", [
        email,
        hash,
        role,
    ]);
}
async function authenticateUser(email, password) {
    const dbClient = await getActiveDb();
    const result = await dbClient.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    const passwordHash = row.passwordHash;
    const match = await bcryptjs_1.default.compare(password, passwordHash);
    if (!match)
        return null;
    return {
        id: Number(row.id ?? 0),
        email: row.email ?? "",
        role: row.role ?? "sales_person",
        created_at: row.created_at ?? new Date().toISOString(),
    };
}
async function getAllUsers() {
    const dbClient = await getActiveDb();
    const result = await dbClient.execute("SELECT id, email, role, created_at FROM users");
    return result.rows.map((row) => ({
        id: Number(row.id ?? 0),
        email: row.email ?? "",
        role: row.role ?? "sales_person",
        created_at: row.created_at ?? new Date().toISOString(),
    }));
}
async function getUserById(id) {
    const dbClient = await getActiveDb();
    const result = await dbClient.execute("SELECT * FROM users WHERE id = ?", [id]);
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    return {
        id: Number(row.id ?? 0),
        email: row.email ?? "",
        role: row.role ?? "sales_person",
        created_at: row.created_at ?? new Date().toISOString(),
    };
}
async function updateUser(id, email, role) {
    const dbClient = await getActiveDb();
    await dbClient.execute("UPDATE users SET email = ?, role = ? WHERE id = ?", [email, role, id]);
}
async function deleteUser(id) {
    const dbClient = await getActiveDb();
    await dbClient.execute("DELETE FROM users WHERE id = ?", [id]);
}
/* =========================
   Receipts
========================= */
async function createReceipt(salesPersonId, total, items) {
    const dbClient = await getActiveDb();
    const processedItems = Array.isArray(items) ? items : [];
    const calculatedTotal = total || processedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let companyPrefix = "GEN";
    const companyProfile = await getCompanyProfile();
    if (companyProfile?.name && companyProfile.name.length >= 3) {
        companyPrefix = companyProfile.name.substring(0, 3).toUpperCase();
    }
    const transactionCode = `trans-${companyPrefix}-${crypto.randomUUID().substring(0, 7)}`;
    await queueOrExecute("receipts", "INSERT", "INSERT OR IGNORE INTO receipts (sales_person_id, total, items_json, transaction_code) VALUES (?, ?, ?, ?)", [salesPersonId, calculatedTotal, JSON.stringify(processedItems), transactionCode]);
}
async function getReceiptsBySalesPerson(salesPersonId) {
    const dbClient = await getActiveDb();
    const result = await dbClient.execute(`SELECT r.id, r.total, r.items_json, r.created_at, r.transaction_code, u.email AS sales_person
     FROM receipts r
     JOIN users u ON r.sales_person_id = u.id
     WHERE r.sales_person_id = ?
     ORDER BY r.created_at DESC`, [salesPersonId]);
    return result.rows.map((row) => ({
        id: Number(row.id ?? 0),
        total: Number(row.total ?? 0),
        sales_person: row.sales_person ?? "",
        created_at: row.created_at ?? new Date().toISOString(),
        transaction_code: row.transaction_code ?? "",
        items: JSON.parse(row.items_json ?? "[]"),
    }));
}
async function getAllReceipts() {
    const dbClient = await getActiveDb();
    const result = await dbClient.execute(`SELECT r.id, r.total, r.items_json, r.created_at, r.transaction_code, u.email AS sales_person
     FROM receipts r
     JOIN users u ON r.sales_person_id = u.id
     ORDER BY r.created_at DESC`);
    return result.rows.map((row) => ({
        id: Number(row.id ?? 0),
        total: Number(row.total ?? 0),
        sales_person: row.sales_person ?? "",
        created_at: row.created_at ?? new Date().toISOString(),
        transaction_code: row.transaction_code ?? "",
        items: JSON.parse(row.items_json ?? "[]"),
    }));
}
async function searchReceipts(startDate, endDate, productName, salesPersonId) {
    const dbClient = await getActiveDb();
    let query = `
    SELECT r.id, r.total, r.items_json, r.created_at, r.transaction_code, u.email AS sales_person
    FROM receipts r
    JOIN users u ON r.sales_person_id = u.id
    WHERE 1=1
  `;
    const args = [];
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
        sales_person: row.sales_person ?? "",
        created_at: row.created_at ?? new Date().toISOString(),
        transaction_code: row.transaction_code ?? "",
        items: JSON.parse(row.items_json ?? "[]"),
    }));
}
/* =========================
   Manual Receipts
========================= */
async function createManualReceipt(salesPersonId, name, weight, sg, goldKarat, amount) {
    const dbClient = await getActiveDb();
    let companyPrefix = "MAN";
    const companyProfile = await getCompanyProfile();
    if (companyProfile?.name && companyProfile.name.length >= 3) {
        companyPrefix = companyProfile.name.substring(0, 3).toUpperCase();
    }
    const transactionCode = `trans-${companyPrefix}-${crypto.randomUUID().substring(0, 7)}`;
    await queueOrExecute("manual_receipts", "INSERT", "INSERT INTO manual_receipts (sales_person_id, name, weight, sg, gold_karat, amount, transaction_code) VALUES (?, ?, ?, ?, ?, ?, ?)", [salesPersonId, name, weight, sg, goldKarat, amount, transactionCode]);
    return transactionCode;
}
async function getAllManualReceipts(limit, offset) {
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
    const args = [limit, offset];
    const result = await dbClient.execute(query, args);
    const receipts = result.rows.map((row) => ({
        id: Number(row.id ?? 0),
        sales_person_id: Number(row.sales_person_id ?? 0),
        name: row.name ?? "",
        weight: Number(row.weight ?? 0),
        sg: Number(row.sg ?? 0),
        gold_karat: row.gold_karat ?? "",
        amount: Number(row.amount ?? 0),
        transaction_code: row.transaction_code ?? "",
        created_at: row.created_at ?? new Date().toISOString(),
        sales_person: row.sales_person ?? "",
    }));
    return { receipts, totalCount };
}
async function getDailyManualReceiptsBySalesPerson(salesPersonId, limit, offset) {
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
    const args = [salesPersonId, today.toISOString(), tomorrow.toISOString()];
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
        name: row.name ?? "",
        weight: Number(row.weight ?? 0),
        sg: Number(row.sg ?? 0),
        gold_karat: row.gold_karat ?? "",
        amount: Number(row.amount ?? 0),
        transaction_code: row.transaction_code ?? "",
        created_at: row.created_at ?? new Date().toISOString(),
        sales_person: row.sales_person ?? "",
    }));
    return { receipts, totalCount };
}
async function searchManualReceipts(startDate, endDate, salesPersonId, search, limit, offset) {
    const dbClient = await getActiveDb();
    let query = `
    SELECT mr.*, u.email as sales_person
    FROM manual_receipts mr
    JOIN users u ON mr.sales_person_id = u.id
    WHERE 1=1
  `;
    const args = [];
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
        }
        else if (search.type === 'amount') {
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
    const countArgs = [];
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
        }
        else if (search.type === 'amount') {
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
        name: row.name ?? "",
        weight: Number(row.weight ?? 0),
        sg: Number(row.sg ?? 0),
        gold_karat: row.gold_karat ?? "",
        amount: Number(row.amount ?? 0),
        transaction_code: row.transaction_code ?? "",
        created_at: row.created_at ?? new Date().toISOString(),
        sales_person: row.sales_person ?? "",
    }));
    return { receipts, totalCount };
}
/* =========================
   Company Profile
========================= */
async function getCompanyProfile() {
    const dbClient = await getActiveDb();
    const result = await dbClient.execute("SELECT name, address, phone, tax_rate FROM company_profile WHERE id = 1");
    if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
            name: row.name ?? "",
            address: row.address ?? "",
            phone: row.phone ?? "",
            tax_rate: Number(row.tax_rate ?? 0),
        };
    }
    return null;
}
async function updateCompanyProfile(profile) {
    await queueOrExecute("company_profile", "INSERT", "INSERT INTO company_profile (id, name, address, phone, tax_rate) VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = ?, address = ?, phone = ?, tax_rate = ?", [profile.name, profile.address, profile.phone, profile.tax_rate, profile.name, profile.address, profile.phone, profile.tax_rate]);
}
/* =========================
   Products
========================= */
async function createProduct(name, price, type, sizeOptions, productCode) {
    await queueOrExecute("products", "INSERT", "INSERT OR IGNORE INTO products (name, product_code, price, size_options, type) VALUES (?, ?, ?, ?, ?)", [name, productCode || crypto.randomUUID(), price, sizeOptions?.join(",") || null, type]);
}
async function getAllProducts() {
    const dbClient = await getActiveDb();
    const result = await dbClient.execute("SELECT * FROM products ORDER BY created_at DESC");
    return result.rows.map((row) => ({
        id: Number(row.id ?? 0),
        name: row.name ?? "",
        price: Number(row.price ?? 0),
        type: row.type ?? "",
        sizeOptions: row.size_options?.split(",") ?? [],
        productCode: row.product_code ?? "",
    }));
}
async function updateProduct(id, name, price, type, sizeOptions) {
    const dbClient = await getActiveDb();
    await dbClient.execute("UPDATE products SET name = ?, price = ?, type = ?, size_options = ? WHERE id = ?", [name, price, type, sizeOptions?.join(",") || null, id]);
}
async function deleteProduct(id) {
    const dbClient = await getActiveDb();
    await dbClient.execute("DELETE FROM products WHERE id = ?", [id]);
}
/* =========================
   Printer Settings
========================= */
async function getPrinterSettings() {
    const dbClient = await getActiveDb();
    const result = await dbClient.execute("SELECT * FROM printer_settings WHERE id = 1");
    return result.rows.length > 0 ? result.rows[0] : null;
}
async function savePrinterSettings(type, connectionType, iface) {
    await queueOrExecute("printer_settings", "INSERT", "INSERT INTO printer_settings (id, type, connectionType, interface) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET type = ?, connectionType = ?, interface = ?", [type, connectionType, iface, type, connectionType, iface]);
}
//# sourceMappingURL=turso.js.map