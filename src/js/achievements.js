import { sendEvent, reportError } from './networking';
import { storageGetSync, storageSetSync } from './util';

const ACHIEVEMENTS = {
  lng_choice: {
    type: 'singular',
  },
  gs_rewrite: {
    type: 'stack',
    milestones: [1, 100, 1000],
  },
};

export async function trackAchievement(key, options = {}) {}
