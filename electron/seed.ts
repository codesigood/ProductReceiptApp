import { createUser, initDB } from "./db/turso.js";
import dotenv from "dotenv";

dotenv.config();

export async function seed() {
  try {
    await initDB();

    // Check if admin user already exists to prevent duplicates
    // This is a simplified check; a more robust solution would query the database
    // For this example, we'll just try to create and catch errors if it exists
    try {
      await createUser("codesigood@gmail.com", "12345678", "admin");
    } catch (e: any) {
      if (e.message.includes("UNIQUE constraint failed")) {
      } else {
        console.error("Error creating admin user:", e);
      }
    }

    // Add more seed data here if needed

  } catch (error) {
    console.error("Seeding failed:", error);
  }
}

seed();