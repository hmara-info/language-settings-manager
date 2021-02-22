import defaultHandler from './content/default';
import facebookHandler from './content/facebook';

export function dispatch(location, document, moreLanguages, lessLanguages) {
  if (location.hostname.match(/\.facebook.com$/)) {
    return new facebookHandler(...arguments);
  } else {
    //return new defaultHandler(...arguments);
  }
}
