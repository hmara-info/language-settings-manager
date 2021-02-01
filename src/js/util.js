export function getExtensionVersion() {
  return getMessage('@@extension_id');
}

export async function storageGet(key) {
  var p = new Promise((resolve) => {
    chrome.storage.local.get(key, function (data) {
      resolve(data);
    });
  });
  return p;
}

export async function storageGetSync(key) {
  var p = new Promise((resolve) => {
    chrome.storage.sync.get(key, function (data) {
      resolve(data);
    });
  });
  return p;
}

export async function storageSetSync(data) {
  chrome.storage.sync.set(data);
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
