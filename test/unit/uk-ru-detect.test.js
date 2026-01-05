/**
 * Tests for Ukrainian/Russian language detection
 * Based on UkrTwi.pm validated approach
 *
 * Run with: node test/unit/uk-ru-detect.test.js
 */

const {
  isUkrainian,
  isRussian,
  detectUkrainianOrRussian,
  detectLanguageWithUkRu,
} = require('../../src/js/content/shared/uk-ru-detect.js');

// Simple test framework
let testsPassed = 0;
let testsFailed = 0;
let currentSuite = '';

function describe(name, fn) {
  console.log(`\n${name}`);
  currentSuite = name;
  fn();
}

function it(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    testsFailed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(
          `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
        );
      }
    },
  };
}

// Tests
describe('Ukrainian/Russian Language Detection', () => {
  describe('isUkrainian()', () => {
    it('detects Ukrainian by exclusive letters', () => {
      // Ukrainian exclusive letters: і ї є ґ
      expect(isUkrainian('Привіт')).toBe(true);
      expect(isUkrainian('Їжак')).toBe(true);
      expect(isUkrainian('Європа')).toBe(true);
      expect(isUkrainian('Ґанок')).toBe(true);
      expect(isUkrainian('Київ')).toBe(true);
      expect(isUkrainian('Україна')).toBe(true);
    });

    it('detects Ukrainian by common words', () => {
      expect(isUkrainian('що це')).toBe(true);
      expect(isUkrainian('як справи')).toBe(true);
      expect(isUkrainian('добре дякую')).toBe(true);
      expect(isUkrainian('чи ви можете')).toBe(true);
    });

    it('rejects Russian-exclusive letters', () => {
      // Russian exclusive letters: ё ъ ы э
      expect(isUkrainian('ёлка')).toBe(false);
      expect(isUkrainian('объект')).toBe(false);
      expect(isUkrainian('рыба')).toBe(false);
      expect(isUkrainian('это')).toBe(false);
    });

    it('rejects stop letters', () => {
      expect(isUkrainian('hello')).toBe(false);
      expect(isUkrainian('σ∂αℓ')).toBe(false);
    });

    it('handles mixed text with Ukrainian markers', () => {
      // If Ukrainian markers present, it's Ukrainian
      expect(isUkrainian('Test Київ Test')).toBe(true);
      expect(isUkrainian('123 Україна 456')).toBe(true);
    });

    it('removes copyright symbols', () => {
      expect(isUkrainian('(с) Київ')).toBe(true);
      expect(isUkrainian('Text (с) більше text')).toBe(true);
    });

    it('handles empty or invalid input', () => {
      expect(isUkrainian('')).toBe(false);
      expect(isUkrainian(null)).toBe(false);
      expect(isUkrainian(undefined)).toBe(false);
      expect(isUkrainian(123)).toBe(false);
    });
  });

  describe('isRussian()', () => {
    it('detects Russian by exclusive letters', () => {
      // Russian exclusive letters: ё ъ ы э
      expect(isRussian('ёлка')).toBe(true);
      expect(isRussian('объект')).toBe(true);
      expect(isRussian('рыба')).toBe(true);
      expect(isRussian('это')).toBe(true);
      expect(isRussian('Москва был')).toBe(true);
    });

    it('detects Russian by common words', () => {
      expect(isRussian('что это')).toBe(true);
      expect(isRussian('как дела')).toBe(true);
      expect(isRussian('хорошо спасибо')).toBe(true);
      expect(isRussian('вы можете')).toBe(true);
    });

    it('CRITICAL: rejects Ukrainian strong markers', () => {
      // ї є ґ are strong Ukrainian markers - text with these cannot be Russian
      expect(isRussian('Їжак')).toBe(false);
      expect(isRussian('Європа')).toBe(false);
      expect(isRussian('Ґанок')).toBe(false);
      expect(isRussian('Test Київ')).toBe(false);
      expect(isRussian('що було Україна')).toBe(false);
    });

    it('CRITICAL: Ukrainian text should never be classified as Russian', () => {
      // Real-world Ukrainian examples
      expect(isRussian('Привіт, як справи?')).toBe(false);
      expect(isRussian('Київ - столиця України')).toBe(false);
      expect(isRussian('Дякую за допомогу')).toBe(false);
      expect(isRussian('Що нового?')).toBe(false);
      expect(isRussian('Українська мова є прекрасною')).toBe(false);
    });

    it('rejects stop letters', () => {
      expect(isRussian('hello')).toBe(false);
      expect(isRussian('σ∂αℓ')).toBe(false);
    });

    it('removes copyright symbols', () => {
      // Copyright removal prevents false detection of 'с' as Russian word
      expect(isRussian('(с) это')).toBe(true); // 'это' is a Russian word
      expect(isRussian('Text (с) очень text')).toBe(true); // 'очень' is a Russian word
    });

    it('handles empty or invalid input', () => {
      expect(isRussian('')).toBe(false);
      expect(isRussian(null)).toBe(false);
      expect(isRussian(undefined)).toBe(false);
      expect(isRussian(123)).toBe(false);
    });
  });

  describe('detectUkrainianOrRussian()', () => {
    it('detects Ukrainian correctly', () => {
      expect(detectUkrainianOrRussian('Привіт, як справи?')).toBe('uk'); // has 'і'
      expect(detectUkrainianOrRussian('Київ - столиця України')).toBe('uk'); // has 'і' and 'ї'
      expect(detectUkrainianOrRussian('Що нового?')).toBe('uk'); // has 'Що' word
    });

    it('detects Russian correctly', () => {
      expect(detectUkrainianOrRussian('Привет, как дела?')).toBe('ru'); // has 'как' word
      expect(detectUkrainianOrRussian('Москва - это столица')).toBe('ru'); // has 'это' word
      expect(detectUkrainianOrRussian('Что нового?')).toBe('ru'); // has 'Что' word
    });

    it('prioritizes Ukrainian over Russian', () => {
      // Mixed text with Ukrainian markers should be classified as Ukrainian
      // Note: if text has BOTH Ukrainian and Russian exclusive letters, it's rejected by both
      expect(detectUkrainianOrRussian('Київ і це')).toBe('uk'); // 'Київ' has 'і', 'це' is UK word
      expect(detectUkrainianOrRussian('Україна була')).toBe('uk'); // 'Україна' has 'ї' and 'і'
    });

    it('returns null for uncertain cases', () => {
      expect(detectUkrainianOrRussian('Hello world')).toBe(null);
      expect(detectUkrainianOrRussian('123456')).toBe(null);
      expect(detectUkrainianOrRussian('')).toBe(null);
    });

    it('handles real-world search result snippets', () => {
      // Ukrainian article title + snippet
      const ukSnippet =
        'Новини України сьогодні. Останні події в Києві та інших містах.';
      expect(detectUkrainianOrRussian(ukSnippet)).toBe('uk');

      // Russian article title + snippet
      const ruSnippet =
        'Новости России сегодня. Последние события в Москве и других городах.';
      expect(detectUkrainianOrRussian(ruSnippet)).toBe('ru');
    });
  });

  describe('detectLanguageWithUkRu()', () => {
    it('uses UK/RU detection for Cyrillic text', async () => {
      const result = await detectLanguageWithUkRu('Привіт, як справи?');
      expect(result).toBe('uk');

      const result2 = await detectLanguageWithUkRu('Привет, как дела?');
      expect(result2).toBe('ru');
    });

    it('returns null for non-Cyrillic text without browser API', async () => {
      const result = await detectLanguageWithUkRu('Hello world');
      expect(result).toBe(null);
    });
  });

  describe('Edge cases and real-world scenarios', () => {
    it('handles text with numbers and punctuation', () => {
      expect(isUkrainian('Київ, 2024 рік.')).toBe(true); // has 'і'
      expect(isRussian('было 2024 года')).toBe(true); // has 'было' word
    });

    it('handles very short text', () => {
      expect(isUkrainian('і')).toBe(true);
      expect(isRussian('с')).toBe(true);
    });

    it('handles mixed Ukrainian/English text', () => {
      // Should still detect Ukrainian if markers present
      expect(detectUkrainianOrRussian('Welcome to Київ')).toBe('uk');
      expect(detectUkrainianOrRussian('Україна is beautiful')).toBe('uk');
    });

    it('handles transliterated text', () => {
      // Transliterated text should not be detected
      expect(detectUkrainianOrRussian('Kyiv Ukraina')).toBe(null);
      expect(detectUkrainianOrRussian('Moskva Rossiya')).toBe(null);
    });

    it('handles common ambiguous Cyrillic words', () => {
      // Words that exist in both languages
      // Should rely on exclusive letters or return uncertain

      // "було" is Ukrainian (common word)
      expect(detectUkrainianOrRussian('було')).toBe('uk');

      // "был" is Russian (common word)
      expect(detectUkrainianOrRussian('был')).toBe('ru');
    });

    it('CRITICAL TEST: Ukrainian content with mixed script should not be Russian', () => {
      // Real search results often have mixed content
      const mixedExample1 = 'BBC News Україна - Останні новини';
      expect(detectUkrainianOrRussian(mixedExample1)).toBe('uk');
      expect(isRussian(mixedExample1)).toBe(false);

      const mixedExample2 = 'Wikipedia - Київ - міста України';
      expect(detectUkrainianOrRussian(mixedExample2)).toBe('uk');
      expect(isRussian(mixedExample2)).toBe(false);
    });

    it('handles URLs and domains in text', () => {
      const textWithUrl = 'Новини на www.ukr.net - Київ сьогодні';
      expect(detectUkrainianOrRussian(textWithUrl)).toBe('uk');
    });
  });
});

// Print summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`${'='.repeat(50)}`);

// Exit with appropriate code
process.exit(testsFailed > 0 ? 1 : 0);
