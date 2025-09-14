"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProductHandlers = registerProductHandlers;
const electron_1 = require("electron");
const turso_js_1 = require("../db/turso.js");
const users_js_1 = require("./users.js");
function requireAdminAuth(token) {
    const s = users_js_1.sessions.get(token);
    if (!s || s.role !== "admin")
        throw new Error("Forbidden: Admin access required"); // Explicitly type 's'
    return s;
}
function registerProductHandlers() {
    electron_1.ipcMain.handle("product:create", async (_evt, product) => {
        try {
            let sizeOptionsArray;
            if (typeof product.sizeOptions === 'string') {
                sizeOptionsArray = product.sizeOptions.split(',').map((s) => s.trim()).filter((s) => s);
            }
            else if (Array.isArray(product.sizeOptions)) {
                sizeOptionsArray = product.sizeOptions;
            }
            await (0, turso_js_1.createProduct)(product.name, product.price, product.type, sizeOptionsArray, product.productCode);
            return { success: true };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("product:getAll", async (_evt, { token }) => {
        try {
            // Allow both admin and sales_person to get all products
            const s = users_js_1.sessions.get(token); // Explicitly type 's'
            if (!s)
                throw new Error("Unauthorized");
            const products = await (0, turso_js_1.getAllProducts)();
            return { success: true, products };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("product:update", async (_evt, { token, id, name, price, type, sizeOptions }) => {
        try {
            requireAdminAuth(token);
            await (0, turso_js_1.updateProduct)(id, name, Number(price), type, sizeOptions);
            return { success: true };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
    electron_1.ipcMain.handle("product:delete", async (_evt, { token, id }) => {
        try {
            requireAdminAuth(token);
            await (0, turso_js_1.deleteProduct)(id);
            return { success: true };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    });
}
//# sourceMappingURL=products.js.map