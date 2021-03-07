import browser from 'webextension-polyfill';
import { storageGetSync } from './util';

let lessLanguages;

function googleSearchRequestListner(details) {
  if (!details.url || !lessLanguages || !lessLanguages.length) {
    return;
  }

  const url = new URL(details.url);
  const params = url.searchParams;
  const lrValues = params.getAll('lr');
  if (lrValues.length) {
    return;
  }
  const needToFilterLanguages = lessLanguages.filter((lang) => {
    const value = `-lang_${lang}`;
    return !lrValues.includes(value);
  });
  if (!needToFilterLanguages.length) {
    return;
  }
  const filterValue =
    '-' + lessLanguages.map((lang) => `lang_${lang}`).join('|');

  url.searchParams.append('lr', filterValue);
  return {
    redirectUrl: url.toString(),
  };
}

async function syncLanguagesConfig() {
  storageGetSync('userSettings').then((settings) => {
    const userSettings = settings.userSettings;
    if (!userSettings) return;

    lessLanguages = userSettings.lessLanguages;
    return lessLanguages;
  });
}

export default async function runGoogleSearchRewrite() {
  syncLanguagesConfig().then((languages) => {
    browser.webRequest.onBeforeRequest.addListener(
      googleSearchRequestListner,
      {
        urls: ['https://www.google.com/search?*'],
      },
      ['blocking']
    );
  });

  // Update config every 30 minutes:
  // it's sync and might be changed on another device
  setInterval(syncLanguagesConfig, 30 * 60 * 1000);
}
