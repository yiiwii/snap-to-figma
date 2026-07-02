(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  if (!window.figma?.captureForDesignRaw || !window.figma?.copyCapturePayloadToClipboard) {
    throw new Error(
      "window.figma.captureForDesignRaw/copyCapturePayloadToClipboard is not available. capture.js may not have loaded."
    );
  }

  const HIGHLIGHT_ID = "__figma_capture_select_highlight__";
  const CURSOR_STYLE_ID = "__figma_capture_select_cursor__";

  function removeHelpers() {
    const highlight = document.getElementById(HIGHLIGHT_ID);
    if (highlight) {
      highlight.remove();
    }
    const cursorStyle = document.getElementById(CURSOR_STYLE_ID);
    if (cursorStyle) {
      cursorStyle.remove();
    }
  }

  function getUniqueSelector(element) {
    if (element === document.body) {
      return "body";
    }
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const classes = Array.from(element.classList || []);
    if (classes.length > 0) {
      for (const className of classes) {
        const candidate = `.${CSS.escape(className)}`;
        if (document.querySelectorAll(candidate).length === 1) {
          return candidate;
        }
      }
    }

    const parts = [];
    let node = element;
    while (node && node !== document.body && node !== document.documentElement) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part = `#${CSS.escape(node.id)}`;
        parts.unshift(part);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const sameTagSiblings = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(node) + 1;
          part += `:nth-of-type(${index})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function createHighlightBox() {
    const box = document.createElement("div");
    box.id = HIGHLIGHT_ID;
    box.style.position = "fixed";
    box.style.pointerEvents = "none";
    box.style.border = "2px dashed #3b82f6";
    box.style.background = "rgba(59, 130, 246, 0.14)";
    box.style.borderRadius = "6px";
    box.style.zIndex = "2147483646";
    box.style.display = "none";
    return box;
  }

  function createCursorStyle() {
    const style = document.createElement("style");
    style.id = CURSOR_STYLE_ID;
    style.textContent = "* { cursor: crosshair !important; }";
    return style;
  }

  function waitForElementSelection() {
    return new Promise((resolve, reject) => {
      const highlight = createHighlightBox();
      document.documentElement.appendChild(highlight);
      document.head.appendChild(createCursorStyle());

      const isToolbarNode = (node) =>
        Boolean(
          node &&
            (node.id === "__figma_capture_mode_toolbar__" ||
              node.closest?.("#__figma_capture_mode_toolbar__") ||
              node.getAttribute?.("data-figma-capture-ignore") === "1")
        );

      const updateHighlight = (event) => {
        const element = document
          .elementsFromPoint(event.clientX, event.clientY)
          .find((candidate) => !isToolbarNode(candidate));
        if (!element) {
          highlight.style.display = "none";
          return;
        }
        const rect = element.getBoundingClientRect();
        highlight.style.display = "block";
        highlight.style.left = `${rect.left}px`;
        highlight.style.top = `${rect.top}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
      };

      const onClick = (event) => {
        if (isToolbarNode(event.target)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        cleanup();
        resolve(event.target);
      };

      const onKeyDown = (event) => {
        if (event.key !== "Escape") {
          return;
        }
        event.preventDefault();
        cleanup();
        reject(new Error("Element selection cancelled."));
      };

      const cleanup = () => {
        document.removeEventListener("mousemove", updateHighlight, true);
        document.removeEventListener("click", onClick, true);
        document.removeEventListener("keydown", onKeyDown, true);
        removeHelpers();
      };

      document.addEventListener("mousemove", updateHighlight, true);
      document.addEventListener("click", onClick, true);
      document.addEventListener("keydown", onKeyDown, true);
    });
  }

  try {
    const selectedElement = await waitForElementSelection();
    const selector = getUniqueSelector(selectedElement);
    await sleep(150);
    const payload = await window.figma.captureForDesignRaw(selector);
    await window.figma.copyCapturePayloadToClipboard(payload);
    return { ok: true };
  } finally {
    removeHelpers();
  }
})();
