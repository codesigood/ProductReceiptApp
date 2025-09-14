"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBackupEmail = sendBackupEmail;
const electron_1 = require("electron");
const nodemailer_1 = __importDefault(require("nodemailer"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const DB_PATH = path.join(process.cwd(), "product_receipt_local.db");
const TEMP_DB_COPY_PATH = path.join(electron_1.app.getPath("temp"), "product_receipt_local_backup.db");
async function sendBackupEmail() {
    try {
        await fs.copy(DB_PATH, TEMP_DB_COPY_PATH);
        const transporter = nodemailer_1.default.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        const info = await transporter.sendMail({
            from: `"Product Receipt App" <${process.env.EMAIL_USER}>`,
            to: process.env.BACKUP_EMAIL_TO,
            subject: "Database Backup",
            text: "Attached is the latest database backup.",
            attachments: [
                {
                    filename: "product_receipt_backup.db",
                    path: TEMP_DB_COPY_PATH,
                },
            ],
        });
        await fs.remove(TEMP_DB_COPY_PATH);
        return `Backup email sent successfully! MessageId: ${info.messageId}`;
    }
    catch (err) {
        return `Backup failed: ${err.message}`;
    }
}
//# sourceMappingURL=emailBackupService.js.map