import browser from 'webextension-polyfill';
import { storageGetSync } from './util';

let lessLanguages;

async function syncLanguagesConfig() {
  storageGetSync('userSettings').then((settings) => {
    const userSettings = settings.userSettings;
    if (!userSettings) return;
    if (
      JSON.stringify(userSettings.lessLanguages) ===
      JSON.stringify(lessLanguages)
    )
      return;

    lessLanguages = userSettings.lessLanguages;
    return setupDynamicRewriteRules();
  });
}

async function setupDynamicRewriteRules() {
  const filterValue =
    '-' + lessLanguages.map((lang) => `lang_${lang}`).join('|');

  return chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            transform: {
              queryTransform: {
                addOrReplaceParams: [{ key: 'lr', value: filterValue }],
              },
            },
          },
        },
        condition: {
          regexFilter:
            'google\\.(\\w\\w|co\\.(\\w\\w)|com|com\\.(\\w\\w)|\\w\\w)/search',
          resourceTypes: ['main_frame'],
        },
      },
    ],
    removeRuleIds: [1],
  });
}

export default async function runGoogleSearchRewrite() {
  await syncLanguagesConfig();
  // Update config every 30 minutes:
  // it's sync and might be changed on another device
  setInterval(syncLanguagesConfig, 30 * 60 * 1000);
}
