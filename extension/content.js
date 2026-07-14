// SudoVoice content script — dictation into whatever has focus.
// Injected on demand; guards against double-injection.
(() => {
  if (window.__sudovoice) return;

  const state = {
    recognition: null,
    listening: false,
    chip: null,
    lang: "en-IN",
  };

  // ------------------------------------------------------------ text insert
  // Inserts text at the cursor of the focused editable. Returns false if the
  // focused element isn't editable (caller then falls back to clipboard).
  function insertAtCursor(text) {
    const el = document.activeElement;
    if (!el) return false;

    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      el.setRangeText(text, start, end, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    if (el.isContentEditable) {
      // execCommand is deprecated but still the only way to hit the page's
      // undo stack + frameworks' mutation observers (Docs, Notion, etc).
      document.execCommand("insertText", false, text);
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------ brand chip
  function ensureChip() {
    if (state.chip) return state.chip;
    const chip = document.createElement("div");
    chip.setAttribute("data-sudovoice", "");
    Object.assign(chip.style, {
      position: "fixed",
      left: "50%",
      bottom: "18px",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 14px",
      background: "rgba(4,7,15,0.94)",
      border: "1px solid rgba(0,230,118,0.4)",
      borderRadius: "8px",
      font: "12px/1 Consolas, 'Cascadia Code', monospace",
      color: "#00E676",
      boxShadow: "0 4px 24px rgba(0,230,118,0.18)",
      pointerEvents: "none",
    });
    const dot = document.createElement("span");
    Object.assign(dot.style, {
      width: "7px", height: "7px", borderRadius: "50%",
      background: "#00E676",
      animation: "sv-pulse 1s infinite",
    });
    const style = document.createElement("style");
    style.textContent = "@keyframes sv-pulse{50%{opacity:.3}}";
    const label = document.createElement("span");
    chip.append(style, dot, label);
    chip.__label = label;
    document.documentElement.appendChild(chip);
    state.chip = chip;
    return chip;
  }

  function setChip(text, isError) {
    const chip = ensureChip();
    chip.__label.textContent = text;
    chip.style.borderColor = isError ? "rgba(255,82,82,0.5)" : "rgba(0,230,118,0.4)";
    chip.style.color = isError ? "#FF8A80" : "#00E676";
    chip.style.display = "flex";
  }

  function hideChip() {
    if (state.chip) state.chip.style.display = "none";
  }

  // ------------------------------------------------------------ dictation
  function start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setChip("$ error: speech api unavailable", true);
      setTimeout(hideChip, 2500);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = state.lang;

    rec.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript + " ";
      }
      if (finalText && !insertAtCursor(finalText)) {
        navigator.clipboard?.writeText(finalText.trim()).catch(() => {});
        setChip("$ no text field focused — copied to clipboard");
        setTimeout(() => state.listening && setChip("$ listening… (Alt+Shift+V to stop)"), 1600);
      }
    };
    rec.onerror = (e) => {
      setChip(`$ error: ${e.error}`, true);
      teardown(2200);
    };
    rec.onend = () => {
      // Chrome ends sessions on silence; restart while user wants to listen.
      if (state.listening) {
        try { rec.start(); } catch { teardown(0); }
      }
    };

    state.recognition = rec;
    state.listening = true;
    rec.start();
    setChip("$ listening… (Alt+Shift+V to stop)");
  }

  function teardown(delayMs) {
    state.listening = false;
    const rec = state.recognition;
    if (rec) {
      // Same bug class as the website demo: detach handlers BEFORE abort so
      // queued results can't keep typing after stop.
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try { rec.abort(); } catch { /* already stopped */ }
      state.recognition = null;
    }
    setTimeout(hideChip, delayMs ?? 0);
  }

  function toggle() {
    if (state.listening) teardown(0);
    else chrome.storage?.sync?.get({ lang: "en-IN" }, (v) => { state.lang = v.lang; start(); });
  }

  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg.type === "sv-toggle") { toggle(); sendResponse({ listening: state.listening }); }
    if (msg.type === "sv-status") sendResponse({ listening: state.listening });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.listening) teardown(0);
  }, true);

  // Exposed for automated tests (and console debugging).
  window.__sudovoice = { toggle, insertAtCursor, teardown };
})();
