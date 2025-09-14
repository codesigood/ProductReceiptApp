"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessions = void 0;
exports.loadSessionsFromDb = loadSessionsFromDb;
exports.registerUserHandlers = registerUserHandlers;
const electron_1 = require("electron");
const crypto_1 = require("crypto");
const turso_js_1 = require("../db/turso.js");
// simple in-memory sessions
exports.sessions = new Map();
// Load active sessions from DB on startup
async function loadSessionsFromDb() {
    const activeSessions = await (0, turso_js_1.getAllActiveSessions)();
    activeSessions.forEach(session => {
        exports.sessions.set(session.token, { id: session.userId, role: session.role });
    });
}
// Clean up expired sessions periodically
setInterval(turso_js_1.cleanExpiredSessions, 5 * 60 * 1000); // Every 5 minutes
function requireAuth(token) {
    const s = exports.sessions.get(token);
    if (!s) {
        throw new Error("Unauthorized");
    }
    return s;
}
function registerUserHandlers() {
    electron_1.ipcMain.handle("user:create", async (_evt, { token, email, password, role }) => {
        try {
            const s = requireAuth(token);
            if (s.role !== 'admin')
                throw new Error('Forbidden');
            await (0, turso_js_1.createUser)(email, password, role);
            return { success: true };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("user:login", async (_evt, { email, password }) => {
        try {
            const user = await (0, turso_js_1.authenticateUser)(email, password);
            if (!user)
                return { success: false, message: "Invalid credentials" };
            const token = (0, crypto_1.randomUUID)();
            const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour expiration
            await (0, turso_js_1.saveSession)(token, user.id, user.role, expiresAt);
            exports.sessions.set(token, { id: user.id, role: user.role });
            return { success: true, token, user: { id: user.id, email: user.email, role: user.role } };
        }
        catch (e) {
            console.error("Backend: Error during user login:", e);
            return { success: false, message: e.message || "An unknown error occurred during login." };
        }
    });
    electron_1.ipcMain.handle("user:logout", async (_evt, { token }) => {
        await (0, turso_js_1.deleteSession)(token);
        exports.sessions.delete(token);
        return { success: true };
    });
    electron_1.ipcMain.handle("user:getAll", async (_evt, { token }) => {
        try {
            requireAuth(token);
            const users = await (0, turso_js_1.getAllUsers)();
            return { success: true, users };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("user:update", async (_evt, { token, id, email, role }) => {
        try {
            const s = requireAuth(token);
            if (s.role !== 'admin')
                throw new Error('Forbidden');
            await (0, turso_js_1.updateUser)(id, email, role);
            return { success: true };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("user:delete", async (_evt, { token, id }) => {
        try {
            const s = requireAuth(token);
            if (s.role !== 'admin')
                throw new Error('Forbidden');
            await (0, turso_js_1.deleteUser)(id);
            return { success: true };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
}
//# sourceMappingURL=users.js.map