import { db, type LocalProfile } from './db';

const DEFAULT_PREFERENCES: LocalProfile['preferences'] = {
  soundEnabled: true,
  vibrationEnabled: false,
};

export const profileRepo = {
  async getPreferences(): Promise<LocalProfile['preferences']> {
    const profile = await db.profile.get('default');

    if (!profile) {
      return { ...DEFAULT_PREFERENCES };
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...profile.preferences,
    };
  },
};
