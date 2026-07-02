(async () => {
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
    const rect = selectedElement.getBoundingClientRect();

    if (rect.width < 1 || rect.height < 1) {
      return { ok: false, error: "Selected element has no visible area." };
    }

    return {
      ok: true,
      cropRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      },
      devicePixelRatio: window.devicePixelRatio || 1
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error || "Selection cancelled"),
      cancelled: true
    };
  } finally {
    removeHelpers();
  }
})();
