export default class handler {
  constructor(location, document, moreLanguages, lessLanguages) {
    this.location = location;
    this.document = document;
    this.moreLanguages = moreLanguages;
    this.lessLanguages = lessLanguages;
  }

  SUPPORTED_LANGUAGES() {
    return [];
  }

  async needToTweakLanguages() {
    const config = await this.targetLanguagesConfig();
    if (config == null) {
      return Promise.reject();
    }
    return Promise.resolve();
  }

  removeUI() {
    const oldElements = this.document.getElementsByClassName(
      'lahidnaUkrainizatsiya'
    );
    for (let el of oldElements) {
      el.remove();
    }
  }

  async tweakLanguages() {
    const $self = this;

    return $self
      .suggestToChangeLanguages()
      .then(
        (language) => $self.changeLanguageTo(language),
        (reasonRejected) => Promise.reject(reasonRejected)
      )
      .then(() => {
        $self.location.reload();
      })
      .catch((e) => {
        console.log('tweakLangfuagesFlow() rejection', e);
      });
    // TODO: what to do when changeLanguageTo() or one of subcomponents failed?
  }

  async suggestToChangeLanguages() {
    const $self = this;
    const userAnswer = new Promise(async (resolve, reject) => {
      try {
        const languageConfig = await $self.targetLanguagesConfig();

        $self.removeUI();

        const floaterHTML = `
<div style="z-index:5000; width:100%; position: fixed; top: 0;" class="lahidnaUkrainizatsiya">
  <div style="margin: 20px; padding: 10px; border: 1px solid rgba(0,0,0,.09); box-shadow: 15px -4px 17px 1px rgba(19, 19, 22, 0.28); border-radius: 3px; background: #f3f1f1;">
    <span>Facebook підтримує Українську. Налаштувати?</span>
    <div style="float: right">
      <input type='button' value='Так' style='padding: 4px;' class='yes-btn' />
      <input type='button' value='Пізніше' style='padding: 4px;' class='no-btn' />
    </div>
  </div>
</div>
`;
        const floaterTemplate = $self.document.createElement('template');
        floaterTemplate.innerHTML = floaterHTML.trim();
        const floater = floaterTemplate.content.firstChild;
        $self.document.body.appendChild(floater);

        const observer = new MutationObserver(function (mutations) {
          // check for removed target
          mutations.forEach(function (mutation) {
            var nodes = Array.from(mutation.removedNodes);
            if (nodes.indexOf(floater) <= -1) return;
            if (reject) {
              reject('node removed');
            }
            observer.disconnect();
          });
        });

        observer.observe($self.document.body, {
          childList: true,
        });

        // Create ui in DOM
        // Bind 'Yes' function
        $self.document
          .querySelector('.lahidnaUkrainizatsiya .yes-btn')
          .addEventListener('click', function (e) {
            resolve(languageConfig);
            reject = undefined;
            floater.remove();
          });

        // Bind 'No' function
        $self.document
          .querySelector('.lahidnaUkrainizatsiya .no-btn')
          .addEventListener('click', function (e) {
            const options = JSON.stringify(languageConfig);
            reject(`user answered no to options ${options}`);
            reject = undefined;
            floater.remove();
          });
      } catch (e) {
        console.log(e);
      }
    });

    return userAnswer;
  }

  async targetLanguagesConfig() {
    const moreLanguages = this.moreLanguages;
    const supportedWantedLanguages = this.SUPPORTED_LANGUAGES().filter(
      (value) => moreLanguages.includes(value)
    );

    if (supportedWantedLanguages.length == 0) return null;

    const uiLanguage = this.document.documentElement.lang
      .replace(/-.*/, '')
      .toLowerCase();

    if (supportedWantedLanguages.indexOf(uiLanguage) === 0) return;

    return supportedWantedLanguages.filter((value) => value !== uiLanguage);
  }
}
