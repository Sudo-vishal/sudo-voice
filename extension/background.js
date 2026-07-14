// SudoVoice service worker — injects the dictation content script on demand
// (activeTab + scripting keeps permissions minimal: no blanket content script).

async function toggleDictation(tab) {
  if (!tab || !tab.id || !/^https?:/.test(tab.url || "")) return;
  try {
    // Idempotent: content.js guards against double-injection.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    await chrome.tabs.sendMessage(tab.id, { type: "sv-toggle" });
  } catch (err) {
    console.warn("SudoVoice: injection failed", err);
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-dictation") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  toggleDictation(tab);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "sv-toggle-from-popup") {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => toggleDictation(tab))
      .then(() => sendResponse({ ok: true }));
    return true; // async response
  }
});
