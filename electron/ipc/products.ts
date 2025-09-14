import { ipcMain } from "electron";
import { createProduct, getAllProducts, updateProduct, deleteProduct } from "../db/turso.js";
import { sessions } from "./users.js";

function requireAdminAuth(token: string) {
  const s = sessions.get(token);
  if (!s || s.role !== "admin") throw new Error("Forbidden: Admin access required"); // Explicitly type 's'
  return s;
}

export function registerProductHandlers() {
    ipcMain.handle("product:create", async (_evt, product) => {
    try {
      let sizeOptionsArray: string[] | undefined;
      if (typeof product.sizeOptions === 'string') {
        sizeOptionsArray = product.sizeOptions.split(',').map((s:any) => s.trim()).filter((s:any) => s);
      } else if (Array.isArray(product.sizeOptions)) {
        sizeOptionsArray = product.sizeOptions;
      }

      await createProduct(
        product.name,
        product.price,
        product.type,
        sizeOptionsArray,
        product.productCode
      );
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle("product:getAll", async (_evt, { token }) => {
    try {
      // Allow both admin and sales_person to get all products
      const s = sessions.get(token); // Explicitly type 's'
      if (!s) throw new Error("Unauthorized");

      const products = await getAllProducts();
      return { success: true, products };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle("product:update", async (_evt, { token, id, name, price, type, sizeOptions }) => {
    try {
      requireAdminAuth(token);
      await updateProduct(id, name, Number(price), type, sizeOptions);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle("product:delete", async (_evt, { token, id }) => {
    try {
      requireAdminAuth(token);
      await deleteProduct(id);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });
}
