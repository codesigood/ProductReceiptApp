"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCompanyProfileHandlers = registerCompanyProfileHandlers;
const electron_1 = require("electron");
const turso_js_1 = require("../db/turso.js");
const users_js_1 = require("./users.js");
function requireAdminAuth(token) {
    const s = users_js_1.sessions.get(token);
    if (!s || s.role !== "admin")
        throw new Error("Forbidden: Admin access required");
    return s;
}
function registerCompanyProfileHandlers() {
    electron_1.ipcMain.handle("companyProfile:get", async (_evt, { token }) => {
        try {
            // requireAdminAuth(token);
            const profile = await (0, turso_js_1.getCompanyProfile)();
            return { success: true, profile };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("companyProfile:update", async (_evt, { token, name, address, phone, tax_rate }) => {
        try {
            requireAdminAuth(token);
            const profile = { name, address, phone, tax_rate };
            await (0, turso_js_1.updateCompanyProfile)(profile);
            return { success: true };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
}
//# sourceMappingURL=companyProfile.js.map