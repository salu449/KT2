import { getAllSavedRecords, updateRecordDriveSync, SavedVisaRecord } from './recordsService';
import { uploadFileToDrive } from './driveService';

export interface AutoSyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  error: string | null;
}

/**
 * Returns records that need Drive backup
 */
export function getPendingBackupRecords(): SavedVisaRecord[] {
  const records = getAllSavedRecords();
  return records.filter((r) => !r.driveFileId || r.status !== 'backed_up');
}

/**
 * Sync all pending visa records to Google Drive as structured JSON and data archives
 */
export async function syncPendingRecordsToDrive(
  accessToken: string,
  onProgress?: (current: number, total: number, visaName: string) => void
): Promise<{ successCount: number; failCount: number }> {
  const pending = getPendingBackupRecords();
  if (pending.length === 0) {
    return { successCount: 0, failCount: 0 };
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pending.length; i++) {
    const record = pending[i];
    const personName = record.data.nameEnglish || record.data.visaNumber || 'Applicant';
    
    if (onProgress) {
      onProgress(i + 1, pending.length, personName);
    }

    try {
      // 1. Create a clean JSON backup payload
      const jsonContent = JSON.stringify(record, null, 2);
      const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
      const safeName = personName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Kuwait_eVisa_${safeName}_${record.data.visaNumber || record.id}.json`;

      // 2. Upload to user's Google Drive folder
      const driveItem = await uploadFileToDrive(accessToken, {
        fileName,
        blob: jsonBlob,
        mimeType: 'application/json',
        description: `কুয়েত ভিসা ব্যাকআপ (${personName}, ভিসা: ${record.data.visaNumber})`,
      });

      // 3. Update local record state
      updateRecordDriveSync(
        record.id,
        driveItem.id,
        driveItem.webViewLink || `https://drive.google.com/file/d/${driveItem.id}/view`,
        fileName
      );

      successCount++;
    } catch (err) {
      console.error(`Auto-sync failed for record ${record.id}:`, err);
      failCount++;
    }
  }

  return { successCount, failCount };
}
