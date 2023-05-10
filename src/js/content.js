import '../img/icon-128.png';
import '../img/icon-64.png';
import '../img/icon-32.png';

import { storageGetSync, reportError } from './util';
import { dispatch } from './routing';

storageGetSync('userSettings').then((settings) => {
  let userSettings = settings.userSettings || {};
  let moreLanguages = userSettings.moreLanguages || [];
  let lessLanguages = userSettings.lessLanguages || [];

  if (moreLanguages.length === 0) {
    console.log('moreLanguages not set. Not processing the page');
    return;
  }

  const handler = dispatch(
    window.location,
    document,
    moreLanguages,
    lessLanguages
  );

  try {
    console.log(`Dispatched to content handler ${handler.handlerName}`);
    handler
      .needToTweakLanguages()
      .then((config) => handler.tweakLanguages())
      .then((events) => {
        if (!events) return;
        console.log(
          `Postprocessing ${events.length} events after tweaking languages`
        );
        for (let evt of events) {
          sendEvent(e.type, e.data);
        }
        return true;
      })
      .catch((e) => {
        console.log(
          `tweakLanguages flow if ${handler.handlerName} ` +
            `produced an exception`,
          e
        );
        if (e === handler.NOOP) return;
        reportError(`Error in ${handler.handlerName} content flow`, e);
      });
  } catch (e) {
    reportError(`content.js: fatal error in ${handler.handlerName} flow`, e);
  }
});
