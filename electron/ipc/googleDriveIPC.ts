// electron/ipc/googleDriveIPC.ts
import { BrowserWindow, ipcMain } from 'electron';
import {
  authorizeGoogleDrive,
  completeGoogleDriveAuthorization,
  performGoogleDriveBackup,
} from '../services/googleDriveBackupService.js';

export function registerGoogleDriveIPC() {
  // Handle Google Drive Backup
  ipcMain.handle('google-drive-backup', async () => {
    return await performGoogleDriveBackup();
  });

  // Handle initial authorization (triggers URL or confirms authorization)
ipcMain.handle('google-drive-authorize', async () => {
  try {
    const result = await authorizeGoogleDrive();
    if (result.client) {
      return { success: true, url: null }; // Already authorized
    }
    return { success: false, url: result.url }; // Need user consent
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

  // Handle completion of authorization (auth code from renderer)
  ipcMain.handle('google-drive-complete-auth', async (_, authCode: string) => {
    try {
      await completeGoogleDriveAuthorization(authCode);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });
 
}
