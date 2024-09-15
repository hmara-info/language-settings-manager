import { sendEvent, reportError } from './networking';
import { storageGetSync, storageSetSync, getMessage, FEATURES } from './util';
import browser from 'webextension-polyfill';

const ACHIEVEMENTS = {
  lng_choice: {
    type: 'singular',
    title: 'Визначилися з мовою!',
    description: 'Ви визначилися з мовами, які хочете бачити, а яких – ні!',
  },
  gs_rewrite: {
    type: 'stack',
    milestones: [1, 100, 1000],
    title_1: 'Google 🔎 без {lessLanguages}!',
    title_100: '100 × Google 🔎 без {lessLanguages}!',
    title_1000: '100 × Google 🔎 без {lessLanguages}!!!',
    description_1:
      'Ваші перші результати пошуку в Google без {lessLanguages}!\nВам подобається?',
    description_100:
      'Вже сто разів шукали в Google без {lessLanguages}!\nЯк вам? 😊',
    description_1000:
      'Воу! Аж 1000 (тисяча!!!) пошуків в Google, без {lessLanguages}!\nПоділіться враженнями з друзями!',
  },

  // Content-scripts achievements: 'CT_' + handlerName
  'CT_google-search': {
    type: 'singular',
    title: 'Google 🔎 з інтерфейсом {firstLanguage}!',
    description:
      'Вітаємо у вашому оновленому Google!\nВам подобається інтерфейс {firstLanguage}?',
  },

  CT_wikipedia: {
    type: 'stack',
    milestones: [1, 10, 100],
    title_1: 'До витоків! Wiki {firstLanguage}',
    title_10: 'Глибше в інформацію {firstLanguage}!',
    title_100: 'Інформація {firstLanguage} 🤩',
    description_1: 'Ця сторінка Wikipedia є {firstLanguage}? О так!',
    description_10:
      'Вже десть разів знайшли сторінки Wikipedia вашими мовами!\nВам подобається? Діліться з друзями!',
    description_100:
      'Вже в соте знаходите сторінки Wikipedia вашими мовами!\nПодобається? Діліться з друзями!',
  },

  CT_linkedin: {
    type: 'singular',
    title: 'LinkedIn з інтерфейсом {firstLanguage}!',
    description:
      'Вітаємо у вашому оновленому LinkedIn!\nВам подобається інтерфейс {firstLanguage}?',
  },
  CT_youtube: {
    type: 'singular',
    title: 'YouTube з інтерфейсом {firstLanguage}!',
    description:
      'Вітаємо у вашому оновленому YouTube!\nВам подобається інтерфейс {firstLanguage}?',
  },
};

export async function trackAchievement(acKey, options = {}) {
  if (!FEATURES.ACHIEVEMENTS) return true;

  const acData = ACHIEVEMENTS[acKey] || {};
  const storageAchievementKey = `AC_${acKey}`;
  if (!acData) {
    reportError(
      `Attempted to track unknown achievement '${acKey}'`,
      new Error('stack')
    );
    return Promise.reject('Unknown achievement');
  }
  let { [storageAchievementKey]: value } = await storageGetSync(
    storageAchievementKey
  );
  if (!value) value = 0;
  value = value + 1;

  // Singular type has a single implicit milestone
  const milestones = acData.type == 'stack' ? acData.milestones : [1];
  if (!milestones.includes(value)) return;

  const achievementData = { [storageAchievementKey]: value };
  return storageSetSync(achievementData).then(() => {
    sendEvent(`Achievement unlocked`, {
      achievementKey: storageAchievementKey,
      achievementValue: value,
    });
    if (!options.silent) _displayNewAchievement(acKey, value, options);
    return true;
  });
}

async function _displayNewAchievement(acKey, value, options) {
  if (!FEATURES.ACHIEVEMENTS_DISPLAY) return;

  console.log(`Display achievement ${acKey}`, value, options);
  try {
    let titleKey =
      ACHIEVEMENTS[acKey].type == 'stack' ? `title_${value}` : 'title';
    let descKey =
      ACHIEVEMENTS[acKey].type == 'stack'
        ? `description_${value}`
        : 'description';

    let title = options.title || ACHIEVEMENTS[acKey][titleKey];
    let description = options.description || ACHIEVEMENTS[acKey][descKey];

    const pattern = new RegExp(
      '{(' + Object.keys(options).join('|') + ')}',
      'g'
    );

    const localizeKey = (match, key) => {
      let value = options[key];
      if (!value) {
        console.error(`No value defined for ${key} in ${acKey}`);
        return key;
      }

      value = value.replace(/^__MSG_(\w+)__$/, function (match, v1) {
        return v1 ? getMessage(v1) : '';
      });
      return value ? value : key;
    };

    title = title.replace(pattern, localizeKey);
    description = description.replace(pattern, localizeKey);

    browser.notifications.create('AchievementUnlocked' + acKey, {
      title: `🏆 ${title}`,
      message: description,
      iconUrl: '/icon-128.png',
      type: 'basic',
      buttons: [
        {
          title: 'Всі досягнення',
        },
      ],
    });

    browser.notifications.onButtonClicked.addListener(
      function (notifId, btnIdx) {
        if (notifId.startsWith('AchievementUnlocked') && btnIdx === 0) {
          browser.tabs.create({ url: 'https://lu.hmara.info/achievements' });
        }
      }
    );
  } catch (e) {
    reportError('Failed to create achievement notification', e);
  }
}
