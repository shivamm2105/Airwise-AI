import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { HouseholdPreferences, SavedActionRecord } from '../../../shared/types.js';

interface StorageSchema {
  savedActions: SavedActionRecord[];
  preferences: HouseholdPreferences | null;
}

export class StorageService {
  private readonly filePath: string;
  private data: StorageSchema;

  constructor(customPath?: string) {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const isTest = process.env.NODE_ENV === 'test';
    const defaultDir = isServerless ? '/tmp' : path.resolve(process.cwd(), 'server/data');
    const defaultFileName = isTest ? `airwise-test-store-${process.pid}.json` : 'airwise-store.json';
    this.filePath = customPath || process.env.STORAGE_FILE_PATH || path.join(defaultDir, defaultFileName);

    const targetDir = path.dirname(this.filePath);
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
      } catch {
        // Fallback silently to in-memory storage if directory creation is denied
      }
    }

    this.data = this.loadData();
  }

  private loadData(): StorageSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<StorageSchema>;
        return {
          savedActions: Array.isArray(parsed.savedActions) ? parsed.savedActions : [],
          preferences: parsed.preferences ?? null
        };
      }
    } catch (err) {
      console.warn('Failed to read storage file, initializing fresh store:', err);
    }
    return {
      savedActions: [],
      preferences: null
    };
  }

  private persist(): void {
    const serialized = JSON.stringify(this.data, null, 2);
    const tempPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(tempPath, serialized, 'utf-8');
      try {
        fs.renameSync(tempPath, this.filePath);
      } catch (renameErr: unknown) {
        const code = (renameErr as NodeJS.ErrnoException)?.code;
        if (code === 'EPERM' || code === 'EBUSY') {
          // Windows NTFS fallback when another reader/worker briefly locks destination metadata
          fs.writeFileSync(this.filePath, serialized, 'utf-8');
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } else {
          throw renameErr;
        }
      }
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
      console.error('Failed to persist storage to disk:', err);
    }
  }

  // Saved Actions CRUD
  public getSavedActions(): SavedActionRecord[] {
    return this.data.savedActions.map(action => ({ ...action }));
  }

  public saveAction(item: Omit<SavedActionRecord, 'id' | 'savedAt' | 'completed'>): SavedActionRecord {
    const record: SavedActionRecord = {
      ...item,
      id: `act_${crypto.randomUUID()}`,
      savedAt: new Date().toISOString(),
      completed: false
    };
    this.data.savedActions.unshift(record);
    this.persist();
    return { ...record };
  }

  public toggleActionCompletion(id: string): SavedActionRecord | null {
    const item = this.data.savedActions.find(a => a.id === id);
    if (!item) return null;

    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date().toISOString() : undefined;
    this.persist();
    return { ...item };
  }

  public deleteSavedAction(id: string): boolean {
    const initialLen = this.data.savedActions.length;
    this.data.savedActions = this.data.savedActions.filter(a => a.id !== id);
    if (this.data.savedActions.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public clearAllActions(): void {
    this.data.savedActions = [];
    this.persist();
  }

  // Preferences CRUD
  public getPreferences(): HouseholdPreferences | null {
    if (!this.data.preferences) return null;
    return {
      ...this.data.preferences,
      indoorCombustionSources: [...this.data.preferences.indoorCombustionSources]
    };
  }

  public savePreferences(prefs: HouseholdPreferences): void {
    this.data.preferences = {
      ...prefs,
      indoorCombustionSources: [...prefs.indoorCombustionSources]
    };
    this.persist();
  }
}

export const storageService = new StorageService();
