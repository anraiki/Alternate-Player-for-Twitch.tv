# Alternate Player for Twitch.tv — Chromium fork

Alternate Player for Twitch.tv was originally created by **Alexander Choporov (CoolCmd)**. This repository preserves and adapts his extension for Chromium browsers, including Helium, using Manifest V3.

This fork was started because we could no longer find the original Chromium extension. It is based on the Firefox version, ported back to Chromium, and is maintained independently of the original author.

## Install

1. Download or clone this repository to a local folder.
2. Open `chrome://extensions` in Helium or another Chromium browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository folder containing `manifest.json`.
5. Open a Twitch channel to use the player.

After updating the files, click **Reload** on the extension's card and refresh any open Twitch tabs.

## Chromium compatibility

The port uses a Manifest V3 service worker, declarative network rules, and content scripts adapted for Chromium. Its content security policy permits the bundled WebAssembly module, and playback promise handling accounts for interruptions caused by pausing or reloading media.

Extension loading and WebAssembly compilation have been checked in Helium. Full live Twitch playback still needs verification.

The default interface language is English. Much of the inherited source code uses Russian identifiers and diagnostics; translation is ongoing as code is updated.

## Development

The extension loads directly from this folder without a build step. To run the playback regression tests with Node.js:

```sh
node --test tests/*.test.cjs
```

The player supports unencrypted H.264/AAC fragmented MP4 playlists with a separate `EXT-X-MAP` initialization file, as well as the existing MPEG-TS path. Initialization byte ranges and encrypted streams remain unsupported.

For a browser playback smoke test, run `python -m http.server 8000 --bind 127.0.0.1` from the repository, then open `http://127.0.0.1:8000/tests/fmp4-browser.html`. The test sends synthetic media through the actual worker and MediaSource playback path and reports `PASS` after playback ends.

Instructions for rebuilding the bundled WebAssembly file are in [sources/README](sources/README).

## Credits and license

Original extension author: **Alexander Choporov (CoolCmd)**.

Copyright 2016–2023 Alexander Choporov (CoolCmd). The original copyright notice and BSD 3-Clause license are preserved in [LICENSE](LICENSE), along with the separate attributions and licenses for third-party artwork.

This fork does not imply endorsement by the original author.
