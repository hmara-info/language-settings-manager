import defaultHandler from './default';

export default class wikipediaHandler extends defaultHandler {
  handlerName = 'wikipedia';

  SUPPORTED_LANGUAGES() {
    return [
      'uk',
      'crh',
      'hy',
      'af',
      'be',
      'bg',
      'de',
      'en',
      'tl',
      'id',
      'sw',
      'nl',
      'vi',
      'tr',
      'ca',
      'da',
      'et',
      'es',
      'eo',
      'fr',
      'hr',
      'it',
      'lv',
      'lt',
      'hu',
      'no',
      'pl',
      'pt',
      'ro',
      'ru',
      'sk',
      'sl',
      'fi',
      'sv',
      'is',
      'cs',
      'el',
      'sr',
      'iw',
      'ar',
      'fa',
      'hi',
      'th',
      'zh-CN',
      'zh-TW',
      'ja',
      'ko',
    ];
  }

  async _targetLanguagesConfigCached() {
    return null;
  }

  _tweakLanguagesCTA(languageConfig) {
    return 'Ця сторінка є Українською. Переглянути?';
  }

  async _targetLanguagesConfig() {
    const currentLang = document.querySelector('html').getAttribute('lang');
    if (this.moreLanguages.includes(currentLang)) {
      return null;
    }

    const langs = {};
    document
      .querySelectorAll(
        '#p-lang .vector-menu-content a.interlanguage-link-target'
      )
      .forEach((a) => (langs[a.getAttribute('lang')] = a.getAttribute('href')));

    // Wiki layout changed, we support both
    if (!Object.keys(langs).length) {
      document
        .querySelectorAll('li.interlanguage-link a.interlanguage-link-target')
        .forEach(
          (a) => (langs[a.getAttribute('lang')] = a.getAttribute('href'))
        );
    }

    for (var lng of this.moreLanguages) {
      if (!langs[lng]) continue;
      return [lng, langs[lng]];
    }

    return null;
  }

  async _changeLanguageTo(language) {
    window.location.replace(language[1]);
  }

  _reloadPageOnceLanguagesChanged() {
    // do nothing, override base class
  }
}
