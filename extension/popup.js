const $ = (id) => document.getElementById(id);

chrome.storage.sync.get({ lang: "en-IN" }, (v) => { $("lang").value = v.lang; });
$("lang").addEventListener("change", (e) => chrome.storage.sync.set({ lang: e.target.value }));

$("toggle").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "sv-toggle-from-popup" });
  window.close(); // hand focus back to the page so dictation types into it
});
