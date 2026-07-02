(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const payload = await window.figma.captureForDesignRaw("body");
  await window.figma.copyCapturePayloadToClipboard(payload);

  return { ok: true };
})();
