import browser from 'webextension-polyfill';
import { storageGetSync } from './util';

let lessLanguages;

export default async function syncLanguagesConfig() {
  return storageGetSync('userSettings').then((settings) => {
    const userSettings = settings.userSettings;
    if (!userSettings || Object.keys(userSettings) == null) return;
    if (
      JSON.stringify(userSettings.lessLanguages) ===
      JSON.stringify(lessLanguages)
    )
      return Promise.resolve();

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
