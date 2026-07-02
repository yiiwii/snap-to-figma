(() => {
  const TOOLBAR_HOST_ID = "__figma_capture_toolbar_host__";
  const TOAST_ID = "__figma_capture_toast__";
  const SELECT_HIGHLIGHT_ID = "__figma_capture_select_highlight__";
  const SELECT_CURSOR_STYLE_ID = "__figma_capture_select_cursor__";
  const CAPTURE_CURSOR_STYLE_ID = "__figma_capture_cursor_style__";
  const COPY_AS_IMAGE_KEY = "figmaCaptureCopyAsImage";
  let toastTimer = null;
  let copyAsImage = false;

  function removeById(id) {
    const node = document.getElementById(id);
    if (node) {
      node.remove();
    }
  }

  function keepOnlyOneToolbar() {
    const toolbars = Array.from(document.querySelectorAll(`#${TOOLBAR_HOST_ID}`));
    if (toolbars.length <= 1) {
      return;
    }
    const keep = toolbars[toolbars.length - 1];
    for (const toolbar of toolbars) {
      if (toolbar !== keep) {
        toolbar.remove();
      }
    }
  }

  function hardClosePluginUI() {
    if (typeof window.figma?.hideCaptureToolbar === "function") {
      try {
        window.figma.hideCaptureToolbar();
      } catch (_error) {
        // noop
      }
    }

    for (const toolbar of document.querySelectorAll(`#${TOOLBAR_HOST_ID}`)) {
      toolbar.remove();
    }

    removeById(TOAST_ID);
    removeById(SELECT_HIGHLIGHT_ID);
    removeById(SELECT_CURSOR_STYLE_ID);
    removeById(CAPTURE_CURSOR_STYLE_ID);

    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
  }

  function showToast(message) {
    const existing = document.getElementById(TOAST_ID);
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.bottom = "28px";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "2147483647";
    toast.style.padding = "10px 14px";
    toast.style.borderRadius = "10px";
    toast.style.background = "rgba(28, 28, 28, 0.95)";
    toast.style.color = "#fff";
    toast.style.fontSize = "14px";
    toast.style.fontFamily = "Inter, sans-serif";
    toast.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.35)";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 120ms ease";
    document.documentElement.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 140);
      toastTimer = null;
    }, 1600);
  }

  async function copyPngDataUrlToClipboard(dataUrl) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const item = new ClipboardItem({ "image/png": blob });
    await navigator.clipboard.write([item]);
  }

  function waitForNextPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  function hideUiForImageCapture() {
    const nodes = [
      ...document.querySelectorAll(`#${TOOLBAR_HOST_ID}`),
      document.getElementById(TOAST_ID),
      document.getElementById(SELECT_HIGHLIGHT_ID)
    ].filter(Boolean);

    const snapshots = nodes.map((node) => ({
      node,
      visibility: node.style.visibility,
      opacity: node.style.opacity,
      pointerEvents: node.style.pointerEvents
    }));

    for (const { node } of snapshots) {
      node.style.visibility = "hidden";
      node.style.opacity = "0";
      node.style.pointerEvents = "none";
    }

    let restored = false;
    return () => {
      if (restored) {
        return;
      }
      restored = true;
      for (const snapshot of snapshots) {
        snapshot.node.style.visibility = snapshot.visibility;
        snapshot.node.style.opacity = snapshot.opacity;
        snapshot.node.style.pointerEvents = snapshot.pointerEvents;
      }
    };
  }

  function sendAction(type, onSuccess) {
    const CHANNEL_CLOSED_ERROR_FRAGMENT =
      "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received";
    const MAX_RETRIES = 1;

    const withServiceReinit = (next) => {
      chrome.runtime.sendMessage({ type: "FIGMA_TOOLBAR_INIT" }, () => {
        // Ignore init errors here; retry attempt will surface a clean error if it still fails.
        setTimeout(next, 80);
      });
    };

    const handleResponse = (response, attempt, retry) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        const rawMessage = String(runtimeError.message || runtimeError);
        if (
          rawMessage.includes(CHANNEL_CLOSED_ERROR_FRAGMENT) &&
          attempt < MAX_RETRIES &&
          typeof retry === "function"
        ) {
          withServiceReinit(() => retry(attempt + 1));
          return;
        }
        const message = rawMessage.includes(CHANNEL_CLOSED_ERROR_FRAGMENT)
          ? "Capture failed: capture service disconnected. Please try again."
          : `Capture failed: ${rawMessage}`;
        console.error("Capture failed:", rawMessage);
        showToast(message);
        return;
      }
      if (!response || !response.ok) {
        const message = `Capture failed: ${(response && response.error) || "Unknown error"}`;
        console.error("Capture failed:", (response && response.error) || "Unknown error");
        showToast(message);
        return;
      }

      const done = () => {
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      };

      if (response.imageDataUrl) {
        copyPngDataUrlToClipboard(response.imageDataUrl)
          .then(done)
          .catch((error) => {
            console.error("Image clipboard copy failed:", error);
          });
        return;
      }

      done();
    };

    const dispatch = (captureMode, attempt) => {
      const doSend = (restoreUi) => {
        chrome.runtime.sendMessage({ type, captureMode }, (response) => {
          if (typeof restoreUi === "function") {
            restoreUi();
          }
          handleResponse(response, attempt, runAttempt);
        });
      };

      if (captureMode !== "image") {
        doSend();
        return;
      }

      const restoreUi = hideUiForImageCapture();
      waitForNextPaint()
        .catch(() => {})
        .finally(() => {
          doSend(restoreUi);
        });
    };

    const runAttempt = (attempt) => {
      const captureMode = copyAsImage ? "image" : "design";
      dispatch(captureMode, attempt);
    };

    runAttempt(0);
  }

  function persistCopyAsImage() {
    if (!chrome.storage?.local) {
      return;
    }
    chrome.storage.local.set({ [COPY_AS_IMAGE_KEY]: copyAsImage });
  }

  function toggleCopyMode() {
    copyAsImage = !copyAsImage;
    persistCopyAsImage();
    showExistingToolbar();
  }

  function showExistingToolbar(options = {}) {
    const { reset = false } = options;

    if (!window.figma || typeof window.figma.showClipboardToolbar !== "function") {
      return false;
    }

    // Only force-reset on explicit open/boot. Toggles should update in place.
    if (reset) {
      hardClosePluginUI();
    }

    window.figma.showClipboardToolbar({
      imageMode: copyAsImage,
      onToggleImageMode: () => toggleCopyMode(),
      onCopy: () =>
        sendAction("FIGMA_TOOLBAR_COPY_CLIPBOARD", () => {
          showToast("Copied to clipboard!");
        }),
      onCapturePage: () =>
        sendAction("FIGMA_TOOLBAR_ENTIRE_SCREEN", () => {
          showToast("Copied to clipboard!");
        }),
      onSelectElement: () =>
        sendAction("FIGMA_TOOLBAR_SELECT_ELEMENT", () => {
          showToast("Copied to clipboard!");
        }),
      onExtendedFullscreen: () =>
        sendAction("FIGMA_TOOLBAR_EXTENDED_FULLSCREEN", () => {
          showToast("Copied to clipboard!");
        }),
      onClose: () => {
        hardClosePluginUI();
      }
    });
    keepOnlyOneToolbar();
    setTimeout(keepOnlyOneToolbar, 100);
    return true;
  }

  function initToolbarWithInjectedCapture() {
    chrome.runtime.sendMessage({ type: "FIGMA_TOOLBAR_INIT" }, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        const message = `Toolbar init failed: ${runtimeError.message}`;
        console.error("Toolbar init failed:", runtimeError.message);
        showToast(message);
        return;
      }
      if (!response || !response.ok) {
        const message = `Toolbar init failed: ${(response && response.error) || "Unknown error"}`;
        console.error("Toolbar init failed:", (response && response.error) || "Unknown error");
        showToast(message);
        return;
      }
      if (!showExistingToolbar({ reset: true })) {
        console.error("Toolbar init failed: existing toolbar API unavailable.");
        showToast("Toolbar init failed: existing toolbar API unavailable.");
      }
    });
  }

  function boot() {
    if (showExistingToolbar({ reset: true })) {
      return;
    }
    initToolbarWithInjectedCapture();
  }

  if (chrome.storage?.local) {
    chrome.storage.local.get({ [COPY_AS_IMAGE_KEY]: false }, (state) => {
      copyAsImage = Boolean(state && state[COPY_AS_IMAGE_KEY]);
      boot();
    });
  } else {
    boot();
  }
})();
