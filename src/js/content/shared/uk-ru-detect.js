/**
 * Ukrainian and russian language detection
 * Based on UkrTwi.pm - validated approach for distinguishing Ukrainian from russian
 *
 * Key principle: Ukrainian content should NEVER be misclassified as russian.
 * Detection uses character-based analysis first, then word-based fallback.
 */

import browser from 'webextension-polyfill';

/**
 * Ukrainian-exclusive Cyrillic letters
 * These letters appear in Ukrainian but not in russian
 * і, ї, є, ґ are all markers of Ukrainian language
 */
const UK_EXCLUSIVE_LETTERS = /[іїєґІЇЄҐ]/;

/**
 * Russian-exclusive Cyrillic letters
 * These letters appear in russian but not in Ukrainian
 */
const RU_EXCLUSIVE_LETTERS = /[ёъыэЁЪЫЭ]/;

/**
 * Stop letters that indicate neither Ukrainian nor russian
 * (other alphabets, special characters from transliteration, etc.)
 */
const STOP_LETTERS = /[ўáσ∂αℓƒทãњљјЎÁΣ∂ΑℓƑทÃЊЉЈ]/;

/**
 * Common Ukrainian words (subset from frequency analysis)
 * Used as fallback when character-based detection is inconclusive
 */
const UK_WORDS = [
  // Very distinctive Ukrainian words
  'і',
  'треба',
  'що',
  'шо',
  'буде',
  'україни',
  'чи',
  'ви',
  'ти',
  'мене',
  'ще',
  'як',
  'може',
  'де',
  'зараз',
  'україні',
  'року',
  'життя',
  'яка',
  'вона',
  'україна',
  'нічого',
  'добре',
  'така',
  'поки',
  'нема',
  'роботу',
  'писати',
  'любов',
  'шось',
  'знати',
  'він',
  'мені',
  'ні',
  'його',
  'тобі',
  'є',
  'якщо',
  'щоб',
  'був',
  'було',
  'вже',
  'дуже',
  'їх',
  'хто',
  'від',
  'її',
  'чому',
  'цього',
  'лише',
  'щось',
  'мій',
  'тепер',
  'бути',
  'знаєш',
  'тільки',
  'всі',
  'більше',
  'можу',
  'ніколи',
  'цей',
  'йому',
  'можна',
  'зі',
  'дякую',
  'навіть',
  'була',
  'тоді',
  'нього',
  'немає',
  'були',
  'чого',
  'ці',
  'таке',
  'багато',
  'теж',
  'має',
  'завжди',
  'краще',
  'привіт',
  'сьогодні',
  'який',
  'із',
  'які',
  'років',
  'під',
  'знову',
  'сказати',
  'справді',
  'зробити',
  'трохи',
  'робити',
  'мої',
  'твій',
  'потім',
  'такий',
  'ніхто',
  'ніж',
  'воно',
  'цьому',
  'саме',
  'міг',
  'це',
  'ця',
  'собі',
  'потрібно',
  'хтось',
  'хіба',
  'якби',
  'знаєте',
  'їм',
  'куди',
  'після',
  'неї',
  'їй',
  'здається',
  'дещо',
];

/**
 * Common russian words (subset from frequency analysis)
 * Used as fallback when character-based detection is inconclusive
 */
const RU_WORDS = [
  // Very distinctive russian words
  'что',
  'с',
  'ты',
  'это',
  'вы',
  'как',
  'мы',
  'мне',
  'меня',
  'нет',
  'тебя',
  'его',
  'она',
  'если',
  'они',
  'бы',
  'здесь',
  'из',
  'есть',
  'чтобы',
  'хорошо',
  'когда',
  'только',
  'вот',
  'был',
  'всё',
  'было',
  'может',
  'кто',
  'очень',
  'их',
  'будет',
  'почему',
  'еще',
  'быть',
  'где',
  'спасибо',
  'ничего',
  'сейчас',
  'или',
  'могу',
  'чем',
  'мой',
  'надо',
  'этого',
  'теперь',
  'знаешь',
  'нужно',
  'больше',
  'этом',
  'нибудь',
  'со',
  'была',
  'этот',
  'ему',
  'эй',
  'время',
  'даже',
  'хочешь',
  'сказал',
  'ли',
  'себя',
  'должен',
  'никогда',
  'ни',
  'ещё',
  'её',
  'пожалуйста',
  'сюда',
  'привет',
  'тогда',
  'конечно',
  'него',
  'сегодня',
  'тобой',
  'лучше',
  'были',
  'можно',
  'мной',
  'всегда',
  'сказать',
  'сэр',
  'можешь',
  'чего',
  'эти',
  'дело',
  'значит',
  'лет',
  'много',
  'делать',
  'порядке',
  'должны',
  'такой',
  'ведь',
  'всего',
];

// Compile word patterns for efficient matching
// Use Unicode word boundaries for Cyrillic text
const ukWordsPattern = new RegExp(
  '(^|[\\s,.:;!?])(' + UK_WORDS.join('|') + ')($|[\\s,.:;!?])',
  'iu'
);
const ruWordsPattern = new RegExp(
  '(^|[\\s,.:;!?])(' + RU_WORDS.join('|') + ')($|[\\s,.:;!?])',
  'iu'
);

/**
 * Russian word patterns (applied to individual words)
 * These patterns identify russian based on orthographic rules
 */
const RU_WORD_PATTERNS = [
  /^и/i, // Words starting with 'и' - Ukrainian uses 'і' at word start
  /ии$/i, // Words ending with 'ии' - Ukrainian uses 'ії'
  /ее$/i, // Comparative ending (красивее, быстрее) - Ukrainian uses '-іше'
];

/**
 * Ukrainian word patterns (applied to individual words)
 * These patterns identify Ukrainian based on orthographic rules
 */
const UK_WORD_PATTERNS = [
  /ння$/i, // Verbal noun ending (читання, навчання) - russian uses '-ние'
  /ття$/i, // Noun ending (життя, буття) - russian uses '-тие'
];

/**
 * Split text into words, handling zero-width chars and punctuation
 */
function splitIntoWords(text) {
  // Split on whitespace/punctuation
  return text
    .split(/[\u200b-\u200d\ufeff\s,.:;!?()\[\]{}«»""'']+/)
    .filter((w) => w.length > 0);
}

/**
 * Check if text matches any russian word patterns
 * @param {string} text - Text to analyze
 * @returns {boolean} True if a russian word pattern matches
 */
function matchesRuWordPatterns(text) {
  const words = splitIntoWords(text);
  for (const word of words) {
    for (const pattern of RU_WORD_PATTERNS) {
      if (pattern.test(word)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if text matches any Ukrainian word patterns
 * @param {string} text - Text to analyze
 * @returns {boolean} True if a Ukrainian word pattern matches
 */
function matchesUkWordPatterns(text) {
  const words = splitIntoWords(text);
  for (const word of words) {
    for (const pattern of UK_WORD_PATTERNS) {
      if (pattern.test(word)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if text is Ukrainian
 * Returns true only if confident it's Ukrainian
 *
 * @param {string} text - Text to analyze
 * @returns {boolean} True if text is Ukrainian
 */
export function isUkrainian(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Remove copyright symbols written in Cyrillic
  const cleanText = text.replace(/\(\s*с\s*\)/gi, ' ');

  // Check for stop letters (indicates neither Ukrainian nor russian)
  if (STOP_LETTERS.test(cleanText)) {
    return false;
  }

  // Check for russian-exclusive letters
  if (RU_EXCLUSIVE_LETTERS.test(cleanText)) {
    return false;
  }

  // Check for Ukrainian-exclusive letters (strong positive signal)
  if (UK_EXCLUSIVE_LETTERS.test(cleanText)) {
    return true;
  }

  // Fallback: Check for Ukrainian words
  if (ukWordsPattern.test(cleanText)) {
    return true;
  }

  // Check Ukrainian word patterns (words ending with ння, ття, etc.)
  if (matchesUkWordPatterns(cleanText)) {
    return true;
  }

  return false;
}

/**
 * Check if text is russian
 * Returns true only if confident it's russian
 * CRITICAL: Returns false if Ukrainian markers are found
 *
 * @param {string} text - Text to analyze
 * @returns {boolean} True if text is russian (and definitely NOT Ukrainian)
 */
export function isRussian(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Remove copyright symbols written in Cyrillic
  const cleanText = text.replace(/\(\s*с\s*\)/gi, ' ');

  // CRITICAL: Check for Ukrainian exclusive letters
  // If these are present, text cannot be russian
  if (UK_EXCLUSIVE_LETTERS.test(cleanText)) {
    return false;
  }

  // Check for stop letters (indicates neither Ukrainian nor russian)
  if (STOP_LETTERS.test(cleanText)) {
    return false;
  }

  // Check for russian-exclusive letters
  if (RU_EXCLUSIVE_LETTERS.test(cleanText)) {
    return true;
  }

  // Fallback: Check for russian words
  if (ruWordsPattern.test(cleanText)) {
    return true;
  }

  // Check russian word patterns (words starting with и, ending with ии, etc.)
  if (matchesRuWordPatterns(cleanText)) {
    return true;
  }

  return false;
}

/**
 * Detect if text is Ukrainian or russian
 * This is the main function for content filtering
 *
 * @param {string} text - Text to analyze
 * @returns {'uk' | 'ru' | null} Language code or null if uncertain
 */
export function detectUkrainianOrRussian(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Check Ukrainian first (priority)
  if (isUkrainian(text)) {
    return 'uk';
  }

  // Then check russian
  if (isRussian(text)) {
    return 'ru';
  }

  // Cannot determine
  return null;
}

/**
 * Browser API language detection using browser.i18n.detectLanguage()
 * @param {string} text - Text to analyze
 * @returns {Promise<string|null>} Language code or null
 */
async function detectLanguageWithBrowserAPI(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  try {
    // Use browser.i18n.detectLanguage() - standard WebExtension API
    // Available in Chrome, Firefox, Edge, etc.
    if (
      typeof browser !== 'undefined' &&
      browser.i18n &&
      browser.i18n.detectLanguage
    ) {
      const result = await browser.i18n.detectLanguage(text);

      if (result?.languages?.length > 0) {
        // Return the most confident detection
        const topLanguage = result.languages.reduce((prev, current) =>
          current.percentage > prev.percentage ? current : prev
        );
        return topLanguage.language;
      }
    }
  } catch (error) {
    console.warn('Browser language detection failed:', error);
  }

  return null;
}

/**
 * Enhanced language detection that uses UK/RU detection for Cyrillic text
 * Falls back to browser.i18n.detectLanguage() for other languages
 *
 * @param {string} text - Text to analyze
 * @returns {Promise<string|null>} Language code or null
 */
export async function detectLanguageWithUkRu(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Check if text contains significant Cyrillic content
  const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const totalChars = text.trim().length;
  const cyrillicRatio = cyrillicCount / totalChars;

  // If text is significantly Cyrillic, use our specialized detection
  if (cyrillicRatio > 0.3) {
    const ukRuResult = detectUkrainianOrRussian(text);
    if (ukRuResult) {
      return ukRuResult;
    }
    // Our specialized detection could return null
    // if the text is ambiguous. Fallback to browser API, if available
    // Otherwise keep the result
    return null;
  }

  // Default: use browser.i18n.detectLanguage() API
  return await detectLanguageWithBrowserAPI(text);
}

// CommonJS exports for Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isUkrainian,
    isRussian,
    detectUkrainianOrRussian,
    detectLanguageWithUkRu,
  };
}
