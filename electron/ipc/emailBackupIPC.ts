import { ipcMain } from "electron"
import { sendBackupEmail } from "../services/emailBackupService.js"

export function registerEmailBackupIPC() {
  ipcMain.handle("backup:email", async () => {
    return await sendBackupEmail()
  })
}
