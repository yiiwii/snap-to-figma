(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  if (!window.figma?.captureForDesignRaw || !window.figma?.copyCapturePayloadToClipboard) {
    throw new Error(
      "window.figma.captureForDesignRaw/copyCapturePayloadToClipboard is not available. capture.js may not have loaded."
    );
  }

  const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await sleep(400);
  }

  await sleep(1500);
  window.scrollTo(0, 0);

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

  await sleep(1000);
  const payload = await window.figma.captureForDesignRaw("body");
  await window.figma.copyCapturePayloadToClipboard(payload);
  return { ok: true };
})();
