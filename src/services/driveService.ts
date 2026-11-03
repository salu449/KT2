export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
  description?: string;
}

const BACKUP_FOLDER_NAME = 'কুয়েত ই-ভিসা ব্যাকআপ - Kuwait eVisas';

/**
 * Searches for or creates a dedicated backup folder in Google Drive
 */
export async function getOrCreateBackupFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    `name = '${BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!searchRes.ok) {
    const errText = await searchRes.text();
    console.error('Failed to search Drive folder:', errText);
    throw new Error(`Google Drive Search Failed: ${searchRes.statusText}`);
  }
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'কুয়েত ই-ভিসা জেনারেটর অটোমেটিক ব্যাকআপ ফোল্ডার',
    }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('Failed to create Drive folder:', errText);
    throw new Error(`Google Drive Folder Creation Failed: ${createRes.statusText}`);
  }
  const folder = await createRes.json();
  return folder.id;
}

/**
 * Uploads a file (PDF, Image, or JSON) to Google Drive using multipart upload
 */
export async function uploadFileToDrive(
  accessToken: string,
  params: {
    fileName: string;
    blob: Blob;
    mimeType: string;
    description?: string;
  }
): Promise<DriveFileItem> {
  const { fileName, blob, mimeType, description } = params;

  // 1. Get or create folder
  const folderId = await getOrCreateBackupFolder(accessToken);

  // 2. Prepare metadata
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: mimeType,
    description: description || 'Kuwait eVisa Document Backup',
  };

  // 3. Construct multipart body
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;
  const fileBytes = await blob.arrayBuffer();
  const headerPart = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  const encoder = new TextEncoder();
  const headerBuffer = encoder.encode(headerPart);
  const metadataBuffer = encoder.encode(metadataPart);
  const closeBuffer = encoder.encode(closeDelimiter);

  const combinedBody = new Uint8Array(
    metadataBuffer.length + headerBuffer.length + fileBytes.byteLength + closeBuffer.length
  );

  let offset = 0;
  combinedBody.set(metadataBuffer, offset);
  offset += metadataBuffer.length;
  combinedBody.set(headerBuffer, offset);
  offset += headerBuffer.length;
  combinedBody.set(new Uint8Array(fileBytes), offset);
  offset += fileBytes.byteLength;
  combinedBody.set(closeBuffer, offset);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime,size,description',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combinedBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error('Drive upload failed:', errText);
    throw new Error(`Drive Upload Failed: ${res.status} ${res.statusText}`);
  }

  const uploadedFile: DriveFileItem = await res.json();
  return uploadedFile;
}

/**
 * Lists backed-up visa files from Google Drive
 */
export async function listDriveBackups(accessToken: string): Promise<DriveFileItem[]> {
  try {
    const folderId = await getOrCreateBackupFolder(accessToken);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&pageSize=50&fields=files(id,name,mimeType,webViewLink,createdTime,size,description)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error('Failed to list drive files:', err);
      return [];
    }
    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

/**
 * Delete a file from Google Drive
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete file from Google Drive: ${res.statusText}`);
  }
}
