// electron/services/googleDriveBackupService.ts
import { app } from 'electron';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as path from 'path';
import * as fs from 'fs-extra';

// Path where the Google Drive API token will be stored
const TOKEN_PATH = path.join(app.getPath('userData'), 'google_drive_token.json');

// Path to your local database file
const DB_PATH = path.join(app.getAppPath(), 'product_receipt_local.db');
// Temporary path for database copy before uploading
const TEMP_DB_COPY_PATH = path.join(app.getPath('temp'), 'product_receipt_local_backup.db');

// Google Drive API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
];

/**
 * Loads previously authorized credentials.
 */
async function loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
  try {
    const content = await fs.readFile(TOKEN_PATH, 'utf-8');
    const credentials = JSON.parse(content);

    const client = new OAuth2Client(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uri
    );

    client.setCredentials(credentials.tokens);
    return client;
  } catch {
    return null;
  }
}

/**
 * Saves OAuth2 credentials to disk.
 */
async function saveCredentials(client: OAuth2Client) {
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
export async function authorizeGoogleDrive(): Promise<{ client?: OAuth2Client; url?: string }> {
  let client = await loadSavedCredentialsIfExist();
  if (client) return { client };

  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error(
      'Missing Google API credentials. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are set.'
    );
  }

  client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

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
export async function completeGoogleDriveAuthorization(
  authCode: string
): Promise<OAuth2Client> {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error(
      'Missing Google API credentials. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are set.'
    );
  }

  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const { tokens } = await client.getToken(authCode);
  client.setCredentials(tokens);
  await saveCredentials(client);

  console.log('Google Drive authorization completed and credentials saved.');
  return client;
}

/**
 * Uploads a specified file to Google Drive.
 */
async function uploadFileToDrive(
  authClient: OAuth2Client,
  filePath: string,
  fileName: string
) {
  const drive = google.drive({ version: 'v3', auth: authClient });

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
  } catch (err) {
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
export async function performGoogleDriveBackup(): Promise<{
  success: boolean;
  message: string;
  needsAuth?: boolean;
}> {
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
  } catch (error: any) {
    console.error('Google Drive backup failed:', error.message);
    return { success: false, message: `Backup failed: ${error.message}` };
  }
}

