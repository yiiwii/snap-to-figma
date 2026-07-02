# Snap to Figma

Chrome extension that captures the current screen, selected elements, or extended fullscreen, and copies clean design payloads directly to the clipboard for pasting into Figma.

## Install (developer mode)

1. Clone this repo
2. Open `chrome://extensions`, enable **Developer mode**
3. Click **Load unpacked** and select the project folder

## Structure

- `manifest.json` — extension manifest (MV3)
- `background.js` — service worker
- `capture.js` — capture engine
- `inpage-toolbar.js` — in-page toolbar UI
- `runner*.js` — capture mode runners (full page, selection, image, no-scroll)
- `logo/` — icons
