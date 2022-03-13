import defaultHandler from './content/default';
import facebookHandler from './content/facebook';
import googleSearchHandler from './content/google-search';
import wikipediaHandler from './content/wikipedia';

export function dispatch(location, document, moreLanguages, lessLanguages) {
  if (location.hostname.match(/\.facebook.com$/i)) {
    return new facebookHandler(...arguments);
  } else if (
    location.hostname.match(
      /(^|\.)google\.(\w\w|co\.(\w\w)|com|com\.(\w\w)|\w\w)$/i
    )
  ) {
    return new googleSearchHandler(...arguments);
  } else if (location.hostname.match(/\.wikipedia.org$/i)) {
    return new wikipediaHandler(...arguments);
  } else {
    //return new defaultHandler(...arguments);
  }
}
