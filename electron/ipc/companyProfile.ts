
import { ipcMain } from "electron";
import { getCompanyProfile, updateCompanyProfile } from "../db/turso.js";
import { sessions } from "./users.js";
export interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  tax_rate: number;
}
function requireAdminAuth(token: string) {
  const s = sessions.get(token);
  if (!s || s.role !== "admin") throw new Error("Forbidden: Admin access required");
  return s;
}

export function registerCompanyProfileHandlers() {
  ipcMain.handle("companyProfile:get", async (_evt, { token }) => {
    try {
      // requireAdminAuth(token);
      const profile = await getCompanyProfile();
      return { success: true, profile };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle("companyProfile:update", async (_evt, { token, name, address, phone, tax_rate }) => {
    try {
      requireAdminAuth(token);
     const profile: CompanyProfile = { name, address, phone, tax_rate };
      await updateCompanyProfile(profile);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });
}
