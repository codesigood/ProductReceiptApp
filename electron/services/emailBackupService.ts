import { app } from "electron"
import nodemailer from "nodemailer"
import * as path from "path"
import * as fs from "fs-extra"

const DB_PATH = path.join(process.cwd(), "product_receipt_local.db")
const TEMP_DB_COPY_PATH = path.join(app.getPath("temp"), "product_receipt_local_backup.db")

export async function sendBackupEmail(): Promise<string> {
  try {
    await fs.copy(DB_PATH, TEMP_DB_COPY_PATH)

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

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
    })

    await fs.remove(TEMP_DB_COPY_PATH)
    return `Backup email sent successfully! MessageId: ${info.messageId}`
  } catch (err: any) {
    return `Backup failed: ${err.message}`
  }
}
