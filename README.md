# YouTube Alt
> An alternative client of YouTube

[![Last stable release](https://img.shields.io/github/v/release/Wixonic/YouTube-Alt?display_name=tag&label=Last%20stable%20release)](https://github.com/Wixonic/YouTube-Alt/releases) [![Last release](https://img.shields.io/github/v/release/Wixonic/YouTube-Alt?display_name=tag&label=Last%20release&include_prereleases)](https://github.com/Wixonic/YouTube-Alt/releases)<br />
[![Wakatime](https://wakatime.com/badge/github/Wixonic/YouTube-Alt.svg?style=flat)](https://wakatime.com/badge/github/Wixonic/YouTube-Alt) [![CodeQL](https://github.com/Wixonic/YouTube-Alt/actions/workflows/codeql.yml/badge.svg)](https://github.com/Wixonic/YouTube-Alt/actions/workflows/codeql.yml)

- [Installation](#installation)
  - [MacOS](#macos)
    - [Apple Silicon Chips](#apple-silicon-chips)
  - [Windows](#windows)
- [Privacy](#privacy)
- [Support](https://github.com/Wixonic/YouTube-Alt/blob/Default/.github/SUPPORT.md)
- [Code of Conduct](https://github.com/Wixonic/YouTube-Alt/blob/Default/.github/CODE_OF_CONDUCT.md)

[![Contributors](https://img.shields.io/github/contributors/Wixonic/YouTube-Alt?color=%2308F&label=Contributors)](https://github.com/Wixonic/YouTube-Alt/blob/Default/.github/CONTRIBUTING.md)
[![License](https://img.shields.io/github/license/Wixonic/YouTube-Alt?color=%23555&label=License)](https://github.com/Wixonic/YouTube-Alt/blob/Default/LICENSE)

# Installation

## MacOS

**As this application is not verified, you will not be able to open it normally.**

First, you'll need to download the application.
There's three choices:

- Universal (works on every arch, but the file is heavier) [Download this file](https://github.com/Wixonic/YouTube-Alt/releases/latest/download/youtube-alt.mac.universal.dmg).
- Apple Silicon Chips: [Download this file](https://github.com/Wixonic/YouTube-Alt/releases/latest/download/youtube-alt.mac.arm64.dmg).
- Intel Chips: [Download this file](https://github.com/Wixonic/YouTube-Alt/releases/latest/download/youtube-alt.mac.x64.dmg).

Then, open it, and move _YouTube Alt_ to the _Application_ folder:

![[macOS Disk Image Menu - Install](https://github.com/Wixonic/YouTube-Alt/blob/Default/README%20Assets/macos-install.png)](https://github.com/Wixonic/YouTube-Alt/blob/Default/README%20Assets/macos-install.png)

Open a new Finder window, and head to _Applications_, in the sidebar.<br />
Search for _YouTube Alt_, right-click on the app and click on _Open_.<br />
You'll see a warning from macOS, saying that the developer cannot be verified _(yeah, not subscribing to the 100$ Apple Developer Program to make open-source projects)_.<br />
If you understand the risks, click on _Open_:

![[macOS Menu - macOS cannot verify the developer](https://github.com/Wixonic/YouTube-Alt/blob/Default/README%20Assets/macos-verify.png)](https://github.com/Wixonic/YouTube-Alt/blob/Default/README%20Assets/macos-verify.png)

Now, you can open the app normally.

## Apple Silicon chips

> [What are Apple Silicon chips and how can I see if my Mac has one of them?](https://support.apple.com/HT211814)

After installing the app, you'll need to run this command in [Terminal](https://support.apple.com/guide/terminal/welcome/mac).

```shell
xattr -cr "/Applications/YouTube Alt.app"
```

If you don't want to use the Terminal, you can still download the application with the [Intel Chips version](https://github.com/Wixonic/YouTube-Alt/releases/latest/download/youtube-alt.mac.x64.dmg), but you'll need to install [Rosetta 2](https://support.apple.com/HT211861).

## Windows

First, you'll need to download the application.
There's four choices:

- Universal (works with every arch, but the file is heavier) [Download this file](https://github.com/Wixonic/YouTube-Alt/releases/latest/download/youtube-alt.win.universal.exe).
- 64-bit: [Download this file](https://github.com/Wixonic/YouTube-Alt/releases/latest/download/youtube-alt.win.x64.exe).
- ARM 64-bit: [Download this file](https://github.com/Wixonic/YouTube-Alt/releases/latest/download/youtube-alt.win.arm64.exe).
- 32-bit: [Download this file](https://github.com/Wixonic/YouTube-Alt/releases/latest/download/youtube-alt.win.ia32.exe).

# Privacy

This app does not collect any data at all, but uses third party services listed below which may collect some data.<br />
For more information, learn about these third parties:

- [Electron](https://www.electronjs.org)
- [Chromium](https://www.chromium.org), used by _Electron_
- [YouTube](https://www.youtube.com)
- [YouTube Data API](https://developers.google.com/youtube)
- [ytdl-core](https://github.com/fent/node-ytdl-core)
- [Discord-RPC](https://www.npmjs.com/package/discord-rpc)