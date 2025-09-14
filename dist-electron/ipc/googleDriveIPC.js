"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGoogleDriveIPC = registerGoogleDriveIPC;
// electron/ipc/googleDriveIPC.ts
const electron_1 = require("electron");
const googleDriveBackupService_js_1 = require("../services/googleDriveBackupService.js");
function registerGoogleDriveIPC() {
    // Handle Google Drive Backup
    electron_1.ipcMain.handle('google-drive-backup', async () => {
        return await (0, googleDriveBackupService_js_1.performGoogleDriveBackup)();
    });
    // Handle initial authorization (triggers URL or confirms authorization)
    electron_1.ipcMain.handle('google-drive-authorize', async () => {
        try {
            const result = await (0, googleDriveBackupService_js_1.authorizeGoogleDrive)();
            if (result.client) {
                return { success: true, url: null }; // Already authorized
            }
            return { success: false, url: result.url }; // Need user consent
        }
        catch (err) {
            return { success: false, message: err.message };
        }
    });
    // Handle completion of authorization (auth code from renderer)
    electron_1.ipcMain.handle('google-drive-complete-auth', async (_, authCode) => {
        try {
            await (0, googleDriveBackupService_js_1.completeGoogleDriveAuthorization)(authCode);
            return { success: true };
        }
        catch (err) {
            return { success: false, message: err.message };
        }
    });
}
//# sourceMappingURL=googleDriveIPC.js.map