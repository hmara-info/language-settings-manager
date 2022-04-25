import browser from 'webextension-polyfill';
document.getElementById('goToOptions').addEventListener('click', function (e) {
  browser.runtime.openOptionsPage();
  e.preventDefault();
});
