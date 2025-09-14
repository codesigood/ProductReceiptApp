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
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeGoogleDrive = authorizeGoogleDrive;
exports.completeGoogleDriveAuthorization = completeGoogleDriveAuthorization;
exports.performGoogleDriveBackup = performGoogleDriveBackup;
// electron/services/googleDriveBackupService.ts
const electron_1 = require("electron");
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
// Path where the Google Drive API token will be stored
const TOKEN_PATH = path.join(electron_1.app.getPath('userData'), 'google_drive_token.json');
// Path to your local database file
const DB_PATH = path.join(electron_1.app.getAppPath(), 'product_receipt_local.db');
// Temporary path for database copy before uploading
const TEMP_DB_COPY_PATH = path.join(electron_1.app.getPath('temp'), 'product_receipt_local_backup.db');
// Google Drive API scopes
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata',
];
/**
 * Loads previously authorized credentials.
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH, 'utf-8');
        const credentials = JSON.parse(content);
        const client = new google_auth_library_1.OAuth2Client(credentials.client_id, credentials.client_secret, credentials.redirect_uri);
        client.setCredentials(credentials.tokens);
        return client;
    }
    catch {
        return null;
    }
}
/**
 * Saves OAuth2 credentials to disk.
 */
async function saveCredentials(client) {
    const creds = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        tokens: client.credentials,
    };
    await fs.writeFile(TOKEN_PATH, JSON.stringify(creds, null, 2));
}
/**
 * Returns an OAuth2 client, prompting user consent if needed.
 */
async function authorizeGoogleDrive() {
    let client = await loadSavedCredentialsIfExist();
    if (client)
        return { client };
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
        throw new Error('Missing Google API credentials. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are set.');
    }
    client = new google_auth_library_1.OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    // Generate consent screen URL
    const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    // Instead of throwing, return the URL so IPC can pass it to the renderer
    return { url: authUrl };
}
/**
 * Completes OAuth2 login flow using the code from Google redirect.
 */
async function completeGoogleDriveAuthorization(authCode) {
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
        throw new Error('Missing Google API credentials. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are set.');
    }
    const client = new google_auth_library_1.OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    const { tokens } = await client.getToken(authCode);
    client.setCredentials(tokens);
    await saveCredentials(client);
    console.log('Google Drive authorization completed and credentials saved.');
    return client;
}
/**
 * Uploads a specified file to Google Drive.
 */
async function uploadFileToDrive(authClient, filePath, fileName) {
    const drive = googleapis_1.google.drive({ version: 'v3', auth: authClient });
    try {
        const fileMetadata = {
            name: fileName,
            parents: ['appDataFolder'], // requires drive.appdata scope
        };
        const media = {
            mimeType: 'application/x-sqlite3',
            body: fs.createReadStream(filePath),
        };
        const res = await drive.files.create({
            requestBody: fileMetadata,
            media,
            fields: 'id',
        });
        console.log('File uploaded to Google Drive. File ID:', res.data.id);
        return res.data.id;
    }
    catch (err) {
        console.error('Error uploading file to Google Drive:', err);
        throw err;
    }
}
/**
 * Performs the complete database backup process to Google Drive.
 */
/**
 * Performs the complete database backup process to Google Drive.
 */
/**
 * Performs the complete database backup process to Google Drive.
 */
async function performGoogleDriveBackup() {
    try {
        console.log('Starting Google Drive backup...');
        // Step 1: Authorize with Google Drive
        const result = await authorizeGoogleDrive();
        if (!result.client) {
            return {
                success: false,
                message: 'Google Drive authorization required. Please complete authorization.',
                needsAuth: true,
            };
        }
        const authClient = result.client;
        // Step 2: Copy the database file to a temporary location
        await fs.copy(DB_PATH, TEMP_DB_COPY_PATH);
        console.log(`Database copied to temporary location: ${TEMP_DB_COPY_PATH}`);
        // Step 3: Upload the copied file to Google Drive
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `product_receipt_backup_${timestamp}.db`;
        await uploadFileToDrive(authClient, TEMP_DB_COPY_PATH, backupFileName);
        // Step 4: Clean up the temporary file
        await fs.remove(TEMP_DB_COPY_PATH);
        console.log('Temporary database copy removed.');
        console.log('Google Drive backup completed successfully!');
        return { success: true, message: 'Backup successful!' };
    }
    catch (error) {
        console.error('Google Drive backup failed:', error.message);
        return { success: false, message: `Backup failed: ${error.message}` };
    }
}
//# sourceMappingURL=googleDriveBackupService.js.map