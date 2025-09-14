"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
const turso_js_1 = require("./db/turso.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function seed() {
    try {
        await (0, turso_js_1.initDB)();
        // Check if admin user already exists to prevent duplicates
        // This is a simplified check; a more robust solution would query the database
        // For this example, we'll just try to create and catch errors if it exists
        try {
            await (0, turso_js_1.createUser)("codesigood@gmail.com", "12345678", "admin");
        }
        catch (e) {
            if (e.message.includes("UNIQUE constraint failed")) {
            }
            else {
                console.error("Error creating admin user:", e);
            }
        }
        // Add more seed data here if needed
    }
    catch (error) {
        console.error("Seeding failed:", error);
    }
}
seed();
//# sourceMappingURL=seed.js.map