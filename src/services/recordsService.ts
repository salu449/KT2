import { KuwaitEVisaData } from '../types';

export interface SavedVisaRecord {
  id: string;
  data: KuwaitEVisaData;
  createdAt: string;
  updatedAt: string;
  driveFileId?: string;
  driveFileName?: string;
  driveWebViewLink?: string;
  driveBackedUpAt?: string;
  status: 'draft' | 'generated' | 'backed_up';
}

const STORAGE_KEY = 'bitik_saved_visas_v1';

export function getAllSavedRecords(): SavedVisaRecord[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

export function saveVisaRecord(
  data: KuwaitEVisaData,
  existingId?: string,
  driveInfo?: { driveFileId?: string; driveFileName?: string; driveWebViewLink?: string }
): SavedVisaRecord {
  const records = getAllSavedRecords();
  const now = new Date().toISOString();

  let targetId = existingId;
  let existingIndex = -1;

  if (targetId) {
    existingIndex = records.findIndex((r) => r.id === targetId);
  } else {
    // Check if visaNumber already exists
    existingIndex = records.findIndex(
      (r) => r.data.visaNumber === data.visaNumber && r.data.passportNumber === data.passportNumber
    );
    if (existingIndex !== -1) {
      targetId = records[existingIndex].id;
    }
  }

  if (existingIndex !== -1 && targetId) {
    const existing = records[existingIndex];
    const updated: SavedVisaRecord = {
      ...existing,
      data,
      updatedAt: now,
      driveFileId: driveInfo?.driveFileId || existing.driveFileId,
      driveFileName: driveInfo?.driveFileName || existing.driveFileName,
      driveWebViewLink: driveInfo?.driveWebViewLink || existing.driveWebViewLink,
      driveBackedUpAt: driveInfo?.driveFileId ? now : existing.driveBackedUpAt,
      status: driveInfo?.driveFileId ? 'backed_up' : existing.status,
    };
    records[existingIndex] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return updated;
  }

  // Create new record
  const newId = `visa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newRecord: SavedVisaRecord = {
    id: newId,
    data,
    createdAt: now,
    updatedAt: now,
    driveFileId: driveInfo?.driveFileId,
    driveFileName: driveInfo?.driveFileName,
    driveWebViewLink: driveInfo?.driveWebViewLink,
    driveBackedUpAt: driveInfo?.driveFileId ? now : undefined,
    status: driveInfo?.driveFileId ? 'backed_up' : 'generated',
  };
  records.unshift(newRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return newRecord;
}

export function deleteSavedRecord(id: string): boolean {
  try {
    const records = getAllSavedRecords();
    const filtered = records.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Failed to delete saved record:', err);
    return false;
  }
}

export function updateRecordDriveSync(
  recordId: string,
  driveFileId: string,
  driveWebViewLink: string,
  driveFileName: string
): void {
  const records = getAllSavedRecords();
  const idx = records.findIndex((r) => r.id === recordId);
  if (idx !== -1) {
    records[idx].driveFileId = driveFileId;
    records[idx].driveWebViewLink = driveWebViewLink;
    records[idx].driveFileName = driveFileName;
    records[idx].driveBackedUpAt = new Date().toISOString();
    records[idx].status = 'backed_up';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}
