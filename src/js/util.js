import browser from 'webextension-polyfill';
import { serializeError } from 'serialize-error';
export function getExtensionVersion() {
  return browser.runtime.getManifest().version;
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
  return chrome.i18n.getMessage(msg);
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
