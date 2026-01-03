function show(platform, enabled, useSettingsInsteadOfPreferences) {
    document.body.classList.add(`platform-${platform}`);

    if (useSettingsInsteadOfPreferences) {
        // Update text for macOS 13+ which uses "Settings" instead of "Preferences"
        document.getElementsByClassName('platform-mac state-on')[0].innerText = "Розширення Лагідна Українізація зараз увімкнене. Ви можете вимкнути його в розділі Розширення в Налаштуваннях Safari.";
        document.getElementsByClassName('platform-mac state-off')[0].innerText = "Розширення Лагідна Українізація зараз вимкнене. Ви можете увімкнути його в розділі Розширення в Налаштуваннях Safari.";
        // Note: state-unknown uses step-by-step instructions which don't need version-specific text
        document.getElementsByClassName('platform-mac open-preferences')[0].innerText = "Відкрити налаштування Safari…";
    }

    if (typeof enabled === "boolean") {
        document.body.classList.toggle(`state-on`, enabled);
        document.body.classList.toggle(`state-off`, !enabled);
    } else {
        document.body.classList.remove(`state-on`);
        document.body.classList.remove(`state-off`);
    }
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
}

document.querySelector("button.open-preferences").addEventListener("click", openPreferences);
