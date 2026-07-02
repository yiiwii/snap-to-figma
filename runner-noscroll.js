(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const VIEWPORT_STYLE_ID = "__figma_current_screen_capture_style__";

  if (!window.figma?.captureForDesignRaw || !window.figma?.copyCapturePayloadToClipboard) {
    throw new Error(
      "window.figma.captureForDesignRaw/copyCapturePayloadToClipboard is not available. capture.js may not have loaded."
    );
  }

  const images = Array.from(document.images || []);
  await Promise.allSettled(
    images.map((img) => {
      if (img.complete) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 10000);
      });
    })
  );

  if (document.fonts?.ready) {
    await Promise.race([document.fonts.ready, sleep(3000)]);
  }

  await sleep(500);
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const viewportStyle = document.createElement("style");
  viewportStyle.id = VIEWPORT_STYLE_ID;
  viewportStyle.textContent = [
    "html, body { overflow: hidden !important; }",
    `body { height: ${window.innerHeight}px !important; max-height: ${window.innerHeight}px !important; min-height: ${window.innerHeight}px !important; }`
  ].join("\n");

  try {
    document.documentElement.appendChild(viewportStyle);
    window.scrollTo(scrollX, scrollY);
    await sleep(50);

    const payload = await window.figma.captureForDesignRaw("body");
    await window.figma.copyCapturePayloadToClipboard(payload);
    return { ok: true };
  } finally {
    const style = document.getElementById(VIEWPORT_STYLE_ID);
    if (style) {
      style.remove();
    }
    window.scrollTo(scrollX, scrollY);
  }
})();
