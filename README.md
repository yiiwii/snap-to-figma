# Snap to Figma

**See it. Snap it. Design with it.**

Snap to Figma is a Chrome extension for designers who collect the web. Capture any page — the current screen, a single element, or the full scrolling length — and paste it straight into Figma as a clean design payload. No screenshots buried in your Downloads folder. No tracing over blurry PNGs. Just copy, switch tabs, paste.

## Why

Reference gathering is half of design work, and it's still full of friction: crop, save, drag, re-crop. This extension collapses all of that into one motion — what you see in the browser lands on your Figma canvas, ready to move, measure, and remix.

## What it does

- **Snap the screen** — capture exactly what's in the viewport
- **Snap an element** — hover, click, done; grabs just the component you want
- **Snap the whole page** — extended capture that scrolls so you don't have to
- **Copy, don't download** — everything goes to your clipboard as a Figma-ready payload

## Install (developer mode)

1. Download the code as a `.zip` (**Code → Download ZIP**) and unzip it
2. Open `chrome://extensions`, enable **Developer mode**
3. Click **Load unpacked** and select the unzipped folder
4. Pin the extension, open any page, and snap

## Structure

- `manifest.json` — extension manifest (MV3)
- `background.js` — service worker
- `capture.js` — capture engine
- `inpage-toolbar.js` — in-page toolbar UI
- `runner*.js` — capture mode runners (full page, selection, image, no-scroll)
- `logo/` — icons

---

Made by a designer, for designers. Feedback and issues welcome.
