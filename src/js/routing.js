import defaultHandler from './content/default';
import facebookHandler from './content/facebook';
import googleSearchHandler from './content/google-search';

export function dispatch(location, document, moreLanguages, lessLanguages) {
  if (location.hostname.match(/\.facebook.com$/i)) {
    return new facebookHandler(...arguments);
  } else if (location.hostname.match(/\.google.com$/i)) {
    return new googleSearchHandler(...arguments);
  } else {
    //return new defaultHandler(...arguments);
  }
}
