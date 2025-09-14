import { ipcMain } from "electron";
import { randomUUID } from "crypto";
import { createUser, authenticateUser, getAllUsers, updateUser, deleteUser, saveSession, getSession, deleteSession, cleanExpiredSessions, getAllActiveSessions } from "../db/turso.js";

// simple in-memory sessions
export const sessions = new Map<string, { id: number; role: "admin" | "sales_person" }>();

// Load active sessions from DB on startup
export async function loadSessionsFromDb() {
  const activeSessions = await getAllActiveSessions();
  activeSessions.forEach(session => {
    sessions.set(session.token, { id: session.userId, role: session.role });
  });
}

// Clean up expired sessions periodically
setInterval(cleanExpiredSessions, 5 * 60 * 1000); // Every 5 minutes

function requireAuth(token: string) {
  const s = sessions.get(token);
  if (!s) {
    throw new Error("Unauthorized");
  }
  return s;
}

export function registerUserHandlers() {
  ipcMain.handle("user:create", async (_evt, { token, email, password, role }) => {
    try {
      const s = requireAuth(token);
      if (s.role !== 'admin') throw new Error('Forbidden');
      await createUser(email, password, role);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle("user:login", async (_evt, { email, password }) => {
    try {
      const user = await authenticateUser(email, password);
      if (!user) return { success: false, message: "Invalid credentials" };

      const token = randomUUID();
      const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour expiration
      await saveSession(token, user.id, user.role, expiresAt);
      sessions.set(token, { id: user.id, role: user.role });
      
      return { success: true, token, user: { id: user.id, email: user.email, role: user.role } };
    } catch (e: any) {
      console.error("Backend: Error during user login:", e);
      return { success: false, message: e.message || "An unknown error occurred during login." };
    }
  });

  ipcMain.handle("user:logout", async (_evt, { token }) => {
    await deleteSession(token);
    sessions.delete(token);
    return { success: true };
  });

  ipcMain.handle("user:getAll", async (_evt, { token }) => {
    try {
      requireAuth(token);
      const users = await getAllUsers();
      return { success: true, users };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle("user:update", async (_evt, { token, id, email, role }) => {
    try {
      const s = requireAuth(token);
      if (s.role !== 'admin') throw new Error('Forbidden');
      await updateUser(id, email, role);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle("user:delete", async (_evt, { token, id }) => {
    try {
      const s = requireAuth(token);
      if (s.role !== 'admin') throw new Error('Forbidden');
      await deleteUser(id);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });
}
