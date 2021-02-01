document.getElementById('goToOptions').addEventListener('click', function (e) {
  chrome.runtime.openOptionsPage();
  e.preventDefault();
});
