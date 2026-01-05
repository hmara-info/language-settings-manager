# DuckDuckGo Content Handler

## Overview

The DuckDuckGo content handler (`duckduckgo.js`) filters search results, related search suggestions, and autocomplete suggestions based on user language preferences. Unlike other handlers that modify interface language settings, this handler performs client-side DOM filtering to hide content in unwanted languages.

## Features

### 1. Autocomplete Suggestions Filtering

The handler filters autocomplete suggestions (dropdown) as the user types in the search box by:
- Extracting text from each suggestion item
- Detecting the language of the suggestion query
- Hiding suggestions that match languages in the user's `lessLanguages` configuration

#### Process

1. **Immediate Hiding & Detection**: As soon as autocomplete items are added to the DOM (detected by MutationObserver):
   - Items immediately receive the `lu-ddg-ac-processing` class which hides them
   - Language detection starts **immediately** for each item (async, fire-and-forget)
   - No waiting, no debouncing - detection runs as fast as possible
2. **Filtering Decision**: When detection completes (typically 1-5ms):
   - If should filter: Remove `lu-ddg-ac-processing`, add `lu-ddg-ac-filtered`
   - If should show: Remove `lu-ddg-ac-processing` (item becomes visible)
3. **Container Hiding**: The entire dropdown is hidden (via CSS `:has()` selector) while any item has `lu-ddg-ac-processing` class
4. **Hide Empty Dropdown**: If all suggestions are filtered, the entire dropdown container is hidden

This approach eliminates flicker because items are hidden before their first render and filtering happens immediately on DOM insertion.

#### DOM Structure

DuckDuckGo uses Reach UI combobox component for autocomplete:

**Container:**
```html
<div data-testid="search-autocomplete-menu"
     data-reach-combobox-popover="">
  <ul role="listbox" data-reach-combobox-list="">
    <!-- suggestion items -->
  </ul>
</div>
```

**Regular Search Suggestions:**
```html
<li role="option" data-reach-combobox-option="">
  <span>
    <span>query</span>
    <strong> suggestion</strong>
  </span>
</li>
```

**AI Suggestions:**
```html
<li role="option" data-reach-combobox-option="">
  <div>query text</div>
  <div>– Запитайте Duck.ai</div>
  <div><span>Shift+Enter</span></div>
</li>
```

#### Text Extraction

The handler extracts suggestion text and removes UI labels:
- "–" (dash separator)
- "Запитайте Duck.ai" / "Ask Duck.ai" (AI suggestion label)
- "Shift+Enter" (keyboard hint)

This ensures only the actual query text is analyzed for language detection.

#### Performance Considerations

- **Shorter debounce**: 100ms (vs 300ms for search results) for instant feedback
- **Smaller batches**: 2 items per batch (vs 5 for search results) since autocomplete typically has 5-10 suggestions
- **Fast detection**: Short query text allows for quick character-based language detection

### 2. Search Results Filtering

The handler filters main search results (`<article>` elements) by:
- Extracting text from result titles and snippets
- Detecting the language of the content using the language detection module
- Hiding results that match languages in the user's `lessLanguages` configuration

#### Process

1. **Immediate Hiding**: As soon as articles are added to the DOM, they receive the `lu-ddg-processing` class which hides them with `visibility: hidden` to maintain layout and prevent infinite scroll cascade
2. **Language Detection**: Each article's title and snippet text is analyzed to detect its language
3. **Filtering Decision**: Articles in unwanted languages receive the `lu-ddg-filtered` class which uses `display: none` to remove them from the layout
4. **Show Allowed**: Articles in allowed languages have the `lu-ddg-processing` class removed to make them visible

### 2. Related Searches Filtering

The handler also filters "Related searches" suggestions at the bottom of the page.

#### Identification

Related search links are identified by:
- Having `href` attributes containing `?q=` or `/?q=`
- Not being inside `<article>` elements (which would be regular search results)
- Not being inside `<header>` or `<nav>` elements

#### Filtering Process

1. Extracts text from each related search link
2. Detects the language of the search query
3. Hides the parent `<li class="related-searches__item">` element for unwanted languages
4. Rebalances the distribution across the two `<ol class="related-searches__list">` containers
5. Hides the entire related searches block if all suggestions are filtered

### 3. Related Searches Rebalancing

DuckDuckGo displays related searches in two columns (`<ol>` elements). After filtering, the handler rebalances visible items:

- **Trigger**: Only when items have been filtered and the difference between the two lists is > 1
- **Goal**: Distribute visible items evenly (equal count or differ by at most 1)
- **Method**: Removes all visible items from both lists and redistributes them

**Example:**
- Before: List 1: 6 items, List 2: 2 items → Difference: 4
- After: List 1: 4 items, List 2: 4 items → Balanced

### 4. Empty Related Searches Block Hiding

If all related search suggestions are filtered out:
- The entire `<li class="related_searches">` container is hidden
- This prevents showing an empty "Related searches" section

## CSS Classes

The handler uses the following CSS classes for filtering:

**Search Results:**
- `lu-ddg-processing`: Applied to articles during language detection (uses `visibility: hidden` to maintain layout)
- `lu-ddg-filtered`: Applied to filtered articles (uses `display: none` to remove from layout)

**Related Searches:**
- `lu-ddg-related-filtered`: Applied to filtered related search items (uses `display: none`)

**Autocomplete:**
- `lu-ddg-ac-processing`: Applied to autocomplete suggestions during language detection (uses `visibility: hidden` to prevent flicker)
- `lu-ddg-ac-filtered`: Applied to filtered autocomplete suggestions (uses `display: none` to remove from dropdown)

All classes are styled with `!important` to ensure they override any existing styles.

## DOM Structure

### Search Results
```html
<article>
  <h2><a>Title</a></h2>
  <div data-result="snippet">Description text</div>
</article>
```

### Related Searches
```html
<li class="related_searches">
  <ol class="related-searches__list">
    <li class="related-searches__item">
      <a href="?q=search+query">search query</a>
    </li>
    ...
  </ol>
  <ol class="related-searches__list">
    <li class="related-searches__item">
      <a href="?q=another+query">another query</a>
    </li>
    ...
  </ol>
</li>
```

## Key Methods

### Autocomplete Methods

#### `getAutocompleteContainer()`
Returns the autocomplete dropdown container element using `[data-testid="search-autocomplete-menu"]`.

#### `getAutocompleteItems()`
Returns all autocomplete suggestion items using `li[role="option"][data-reach-combobox-option]`.

#### `getAutocompleteSuggestionText(item)`
Extracts and cleans text from an autocomplete suggestion:
- Gets `textContent` from the item
- Removes UI labels: "–", "Запитайте Duck.ai", "Ask Duck.ai", "Shift+Enter"
- Returns cleaned query text for language detection

#### `filterAutocompleteSuggestions()`
Main filtering method for autocomplete suggestions:
1. Gets all autocomplete items
2. Adds `lu-ddg-ac-processing` class to hide them initially
3. Processes in batches of 2 for performance
4. Applies `lu-ddg-ac-filtered` to unwanted languages
5. Removes `lu-ddg-ac-processing` from allowed languages
6. Calls `hideAutocompleteIfEmpty()` if all suggestions are filtered

#### `startAutocompleteObserver()`
Starts observing DOM for new autocomplete suggestions:
- Uses 100ms debounce for instant feedback
- Observes document body for new `li[role="option"]` elements
- Triggers `filterAutocompleteSuggestions()` when new suggestions appear

#### `hideAutocompleteIfEmpty()`
Hides the entire autocomplete dropdown if all suggestions are filtered:
1. Counts all items and visible items
2. If 0 visible but > 0 total, finds container
3. Adds `lu-ddg-ac-filtered` class to hide entire dropdown

### Search Results Methods

#### `getSearchResults()`
Returns all `<article>` elements on the page (main search results).

### `getRelatedSearches()`
Finds related search links by:
- Selecting all links with `?q=` in href
- Filtering out links inside articles, headers, or navigation
- Returning links that match DuckDuckGo search query patterns

### `getResultText(resultElement)`
Extracts text for language detection from a search result:
- Gets title from `h2 > a`
- Gets snippet from `[data-result="snippet"]`
- Returns combined text (avoids UI elements in user's language)

### `shouldFilterResult(resultElement)`
Determines if a search result should be filtered:
1. Extracts text using `getResultText()`
2. Detects language using `detectLanguage()`
3. Checks if detected language is in `lessLanguages`
4. Returns `true` if should be filtered, `false` otherwise

### `filterSearchResults()`
Main filtering method for search results:
1. Gets all articles
2. Adds `lu-ddg-processing` class to hide them initially
3. Processes in batches of 5 for performance
4. Applies `lu-ddg-filtered` to unwanted languages
5. Removes `lu-ddg-processing` from allowed languages
6. Calls `filterRelatedSearches()` to filter suggestions

### `filterRelatedSearches()`
Filters related search suggestions:
1. Gets all related search links
2. Detects language of each query text
3. Hides parent `<li>` elements for unwanted languages
4. Calls `rebalanceRelatedSearches()` if any were filtered
5. Calls `hideRelatedSearchesIfEmpty()` to hide block if empty

### `rebalanceRelatedSearches()`
Redistributes visible related searches evenly:
1. Finds two `ol.related-searches__list` elements
2. Counts visible items in each list
3. Skips if difference ≤ 1 (already balanced)
4. Removes all visible items from both lists
5. Redistributes evenly (first list gets ⌈n/2⌉ items)

### `hideRelatedSearchesIfEmpty()`
Hides the entire related searches block if no visible items remain:
1. Counts all items and visible items
2. If 0 visible but > 0 total, finds `li.related_searches`
3. Adds `lu-ddg-related-filtered` class to hide entire block

## Performance Considerations

### Batch Processing
Search results are processed in batches of 5 to avoid overwhelming the browser with too many concurrent language detection operations.

### Visibility Strategy
Using `visibility: hidden` during processing instead of `display: none` prevents layout thrashing and infinite scroll from triggering prematurely.

### Mutation Observer
The handler uses a MutationObserver to detect when new search results are added dynamically (infinite scroll) and filters them automatically.

## Integration

The handler is registered in `routing.js`:
```javascript
if (location.hostname.match(/(^|\.)duckduckgo\.com$/i)) {
  return new duckduckgoHandler(...arguments);
}
```

And enabled via feature flags:
- `CT_DUCKDUCKGO` must be set to `true` in feature configuration files

## Manifest Configuration

The content script runs at `document_start` to inject CSS and start observing as early as possible:
```json
{
  "matches": ["https://duckduckgo.com/*", "https://*.duckduckgo.com/*"],
  "js": ["content.bundle.js"],
  "run_at": "document_start"
}
```

## Language Detection

The handler uses the `detectLanguage()` function from `lang-detect.js` which:
1. Attempts to use the browser's Translation API if available
2. Falls back to character-based heuristics (Cyrillic, Latin, CJK, etc.)
3. Returns ISO 639-1 language codes (e.g., 'en', 'uk', 'ru')

## User Configuration

Users configure which languages to filter via the `lessLanguages` setting:
- Languages in this array will be hidden from search results
- Common configuration: `['ru']` to hide Russian content when preferring Ukrainian

## Differences from Other Handlers

Unlike handlers for Google, Facebook, or Wikipedia which:
- Modify URL parameters
- Change interface language settings
- Reload the page

The DuckDuckGo handler:
- Performs client-side DOM filtering only
- Does not modify URLs or settings
- Does not reload the page
- Filters based on actual content language, not interface language
