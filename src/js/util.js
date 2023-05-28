import browser from 'webextension-polyfill';
import { serializeError } from 'serialize-error';
export function getExtensionVersion() {
  return getMessage('@@extension_id');
}

export async function storageGet(key) {
  return browser.storage.local.get(key);
}

export async function storageSet(data) {
  return browser.storage.local.set(data);
}

export async function storageRemove(data) {
  return browser.storage.local.remove(data);
}

export async function storageGetSync(key) {
  return browser.storage.sync.get(key);
}

export async function storageSetSync(data) {
  return browser.storage.sync.set(data);
}

export function getMessage(msg) {
  return browser.i18n.getMessage(msg);
}

export function localizeHtmlPage() {
  //Localize by replacing __MSG_***__ meta tags
  var objects = document.getElementsByTagName('html');
  for (var j = 0; j < objects.length; j++) {
    var obj = objects[j];

    var valStrH = obj.innerHTML.toString();
    var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
      return v1 ? getMessage(v1) : '';
    });

    if (valNewH != valStrH) {
      obj.innerHTML = valNewH;
    }
  }
}

export function reportError(desc, errorData) {
  console.log('util.reportError()', errorData);

  const strError =
    errorData instanceof Error ? serializeError(errorData) : errorData;

  return browser.runtime.sendMessage({
    type: 'content',
    subtype: 'MsgReportError',
    desc: desc,
    errorData: strError,
  });
}

// Factory settings
export let FEATURES = {
  CONTENT: true,
  NOTIFICATIONS: true,
  ACHIEVEMENTS: true,
  ACHIEVEMENTS_DISPLAY: true,
  CONTENT: true,
  CT_FACEBOOK: true,
  CT_GOOGLE_MYACCOUNT: true,
  CT_GOOGLE_SEARCH: true,
  CT_WIKIPEDIA: true,
  CT_LINKEDIN: true,
  CT_YOUTUBE: true,
};

async function updateRuntimeFeatures() {
  return browser.storage.local.get('features').then((features) => {
    if (features && Object.keys(features).length > 0) {
      FEATURES = features;
    }
    return FEATURES;
  });
}

updateRuntimeFeatures();
