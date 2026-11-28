import crypto from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { HouseholdPreferences, SavedActionRecord } from '../../../shared/types.js';

interface StorageSchema {
  savedActions: SavedActionRecord[];
  preferences: HouseholdPreferences | null;
}

function getErrnoCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string') {
    return err.code;
  }
  return undefined;
}

export class StorageService {
  private readonly filePath: string;
  private data: StorageSchema;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(customPath?: string) {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const isTest = process.env.NODE_ENV === 'test';
    const defaultDir = isServerless ? '/tmp' : path.resolve(process.cwd(), 'server/data');
    const defaultFileName = isTest ? `airwise-test-store-${process.pid}.json` : 'airwise-store.json';
    this.filePath = customPath || process.env.STORAGE_FILE_PATH || path.join(defaultDir, defaultFileName);

    this.ensureDirectorySync();
    this.data = this.loadInitialData();
  }

  private ensureDirectorySync(): void {
    const targetDir = path.dirname(this.filePath);
    if (fs.existsSync(targetDir)) return;
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (err: unknown) {
      console.warn('Unable to initialize storage directory; in-memory mode active:', getErrnoCode(err) ?? err);
    }
  }

  private loadInitialData(): StorageSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<StorageSchema>;
        return {
          savedActions: Array.isArray(parsed.savedActions) ? parsed.savedActions : [],
          preferences: parsed.preferences ?? null
        };
      }
    } catch (err: unknown) {
      console.warn('Failed to read storage file, initializing fresh store:', err);
    }
    return {
      savedActions: [],
      preferences: null
    };
  }

  private async persistSnapshotAsync(serialized: string): Promise<void> {
    const tempPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
      await fsPromises.mkdir(path.dirname(this.filePath), { recursive: true });
      await fsPromises.writeFile(tempPath, serialized, 'utf-8');
      try {
        await fsPromises.rename(tempPath, this.filePath);
      } catch (renameErr: unknown) {
        const code = getErrnoCode(renameErr);
        if (code === 'EPERM' || code === 'EBUSY') {
          // Windows NTFS fallback when another reader briefly holds destination metadata
          await fsPromises.writeFile(this.filePath, serialized, 'utf-8');
          await fsPromises.unlink(tempPath).catch(unlinkErr => {
            if (getErrnoCode(unlinkErr) !== 'ENOENT') {
              console.warn('Failed to remove temp storage file after NTFS fallback:', unlinkErr);
            }
          });
        } else {
          throw renameErr;
        }
      }
    } catch (err: unknown) {
      await fsPromises.unlink(tempPath).catch(unlinkErr => {
        if (getErrnoCode(unlinkErr) !== 'ENOENT') {
          console.warn('Failed to remove temp storage file on persist error:', unlinkErr);
        }
      });
      console.error('Failed to persist storage to disk:', err);
    }
  }

  private enqueuePersist(): Promise<void> {
    const serialized = JSON.stringify(this.data, null, 2);
    const nextWrite = this.writeQueue.then(() => this.persistSnapshotAsync(serialized));
    this.writeQueue = nextWrite.catch(() => undefined);
    return nextWrite;
  }

  public getSavedActions(): SavedActionRecord[] {
    return this.data.savedActions.map(action => ({ ...action }));
  }

  public async saveAction(item: Omit<SavedActionRecord, 'id' | 'savedAt' | 'completed'>): Promise<SavedActionRecord> {
    const record: SavedActionRecord = {
      ...item,
      id: `act_${crypto.randomUUID()}`,
      savedAt: new Date().toISOString(),
      completed: false
    };
    this.data.savedActions.unshift(record);
    await this.enqueuePersist();
    return { ...record };
  }

  public async toggleActionCompletion(id: string): Promise<SavedActionRecord | null> {
    const item = this.data.savedActions.find(a => a.id === id);
    if (!item) return null;

    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date().toISOString() : undefined;
    await this.enqueuePersist();
    return { ...item };
  }

  public async deleteSavedAction(id: string): Promise<boolean> {
    const initialLen = this.data.savedActions.length;
    this.data.savedActions = this.data.savedActions.filter(a => a.id !== id);
    if (this.data.savedActions.length !== initialLen) {
      await this.enqueuePersist();
      return true;
    }
    return false;
  }

  public async clearAllActions(): Promise<void> {
    this.data.savedActions = [];
    await this.enqueuePersist();
  }

  public getPreferences(): HouseholdPreferences | null {
    if (!this.data.preferences) return null;
    return {
      ...this.data.preferences,
      indoorCombustionSources: [...this.data.preferences.indoorCombustionSources]
    };
  }

  public async savePreferences(prefs: HouseholdPreferences): Promise<void> {
    this.data.preferences = {
      ...prefs,
      indoorCombustionSources: [...prefs.indoorCombustionSources]
    };
    await this.enqueuePersist();
  }
}

export const storageService = new StorageService();
