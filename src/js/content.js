import '../img/icon-128.png';
import '../img/icon-64.png';
import '../img/icon-32.png';

import { storageGetSync } from './util';
import { sendEvent, reportError } from './networking';
import { dispatch } from './routing';

storageGetSync('userSettings').then((settings) => {
  let userSettings = settings.userSettings || {};
  let moreLanguages = userSettings.moreLanguages || [];
  let lessLanguages = userSettings.lessLanguages || [];

  if (moreLanguages.length === 0) {
    return;
  }

  const handler = dispatch(
    window.location,
    document,
    moreLanguages,
    lessLanguages
  );

  try {
    handler
      .needToTweakLanguages()
      .then(() => handler.tweakLanguages())
      .then(
        (events) => {
          if (!events) return;
          for (let evt of events) {
            sendEvent(e.type, e.data);
          }
        },
        (rejectedReason) => {}
      );
  } catch (e) {
    reportError('content.js', e);
  }
});
