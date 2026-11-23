import fs from 'fs';
import path from 'path';
import { HouseholdPreferences, SavedActionRecord } from '../../../shared/types.js';

interface StorageSchema {
  savedActions: SavedActionRecord[];
  preferences: HouseholdPreferences | null;
  savedLocations: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    region?: string;
    addedAt: string;
  }>;
}

export class StorageService {
  private filePath: string;
  private data: StorageSchema;

  constructor(customPath?: string) {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const dir = isServerless ? '/tmp' : path.resolve(process.cwd(), 'server/data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // Fallback to process.cwd() or memory
      }
    }
    this.filePath = customPath || path.join(dir, 'airwise-store.json');
    this.data = this.loadData();
  }

  private loadData(): StorageSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to read storage file, initializing fresh store:', err);
    }
    return {
      savedActions: [],
      preferences: null,
      savedLocations: []
    };
  }

  private persist(): void {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to persist storage to disk:', err);
    }
  }

  // Saved Actions CRUD
  public getSavedActions(): SavedActionRecord[] {
    return [...this.data.savedActions];
  }

  public saveAction(item: Omit<SavedActionRecord, 'id' | 'savedAt' | 'completed'>): SavedActionRecord {
    const record: SavedActionRecord = {
      ...item,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      savedAt: new Date().toISOString(),
      completed: false
    };
    this.data.savedActions.unshift(record);
    this.persist();
    return record;
  }

  public toggleActionCompletion(id: string): SavedActionRecord | null {
    const item = this.data.savedActions.find(a => a.id === id);
    if (!item) return null;

    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date().toISOString() : undefined;
    this.persist();
    return item;
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
    return this.data.preferences;
  }

  public savePreferences(prefs: HouseholdPreferences): void {
    this.data.preferences = prefs;
    this.persist();
  }

  // Saved Locations CRUD
  public getSavedLocations() {
    return [...this.data.savedLocations];
  }

  public saveLocation(loc: { name: string; latitude: number; longitude: number; country?: string; region?: string }) {
    if (!this.data.savedLocations.some(l => l.name === loc.name && Math.abs(l.latitude - loc.latitude) < 0.01)) {
      this.data.savedLocations.push({ ...loc, addedAt: new Date().toISOString() });
      this.persist();
    }
    return this.data.savedLocations;
  }

  public removeLocation(name: string): void {
    this.data.savedLocations = this.data.savedLocations.filter(l => l.name !== name);
    this.persist();
  }
}

export const storageService = new StorageService();

