"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEmailBackupIPC = registerEmailBackupIPC;
const electron_1 = require("electron");
const emailBackupService_js_1 = require("../services/emailBackupService.js");
function registerEmailBackupIPC() {
    electron_1.ipcMain.handle("backup:email", async () => {
        return await (0, emailBackupService_js_1.sendBackupEmail)();
    });
}
//# sourceMappingURL=emailBackupIPC.js.map