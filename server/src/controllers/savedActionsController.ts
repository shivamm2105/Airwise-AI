import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/StorageService.js';
import {
  HouseholdPreferencesSchema,
  SavedActionIdParamSchema,
  SavedActionInputSchema
} from '../../../shared/schemas.js';

export function getSavedActions(_req: Request, res: Response, next: NextFunction): void {
  try {
    const actions = storageService.getSavedActions();
    res.json({ actions });
  } catch (err) {
    next(err);
  }
}

export async function saveAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = SavedActionInputSchema.parse(req.body);
    const saved = await storageService.saveAction(input);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
}

export async function toggleActionCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = SavedActionIdParamSchema.parse(req.params);
    const updated = await storageService.toggleActionCompletion(id);
    if (!updated) {
      res.status(404).json({ error: 'Not Found', message: 'Saved action not found.' });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = SavedActionIdParamSchema.parse(req.params);
    const success = await storageService.deleteSavedAction(id);
    if (!success) {
      res.status(404).json({ error: 'Not Found', message: 'Saved action not found.' });
      return;
    }
    res.json({ success: true, message: 'Action removed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function clearAllActions(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await storageService.clearAllActions();
    res.json({ success: true, message: 'All saved actions cleared successfully' });
  } catch (err) {
    next(err);
  }
}

export function exportSummary(_req: Request, res: Response, next: NextFunction): void {
  try {
    const actions = storageService.getSavedActions();
    const preferences = storageService.getPreferences();
    const completedCount = actions.filter(a => a.completed).length;

    const summaryReport = {
      title: 'AirWise AI — Environmental Health & Sustainability Action Summary',
      generatedAt: new Date().toISOString(),
      statistics: {
        totalActionsSaved: actions.length,
        actionsCompleted: completedCount,
        completionRatePercentage: actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0
      },
      householdPreferences: preferences,
      actionsList: actions
    };

    res.json(summaryReport);
  } catch (err) {
    next(err);
  }
}

export function getPreferences(_req: Request, res: Response, next: NextFunction): void {
  try {
    const preferences = storageService.getPreferences();
    res.json({ preferences });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const prefs = HouseholdPreferencesSchema.parse(req.body);
    await storageService.savePreferences(prefs);
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    next(err);
  }
}
