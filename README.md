:warning: This project is archived and the repository is no longer maintained.

# faux pas, a faux web font detector

A script to highlight elements that are mismatched incorrectly to @font-face blocks, which may result in shoddy faux bold or faux italic rendering. Works standalone—no dependencies.

Want this on the command line? Check out [`node-faux-pas`](https://github.com/filamentgroup/node-faux-pas).

## [Demo](https://filamentgroup.github.io/faux-pas/dist/demo.html)

A more [comprehensive test page](https://filamentgroup.github.io/faux-pas/test/index.html) is also available.

## What is this?

When you include a CSS `@font-face` block on your page, you specify a `font-family`, `font-weight`, and `font-style` inside that block. When you use a web font, you specify those same properties on elements on your page. While you need to match the value of `font-family` exactly to use the web font, `font-weight` and `font-style` do not require exact matching. This can lead to unexpected behavior as the browser uses what is available, even if it’s not a good match.

Further, if your element wants a `font-weight` less than or equal to `500` but your `@font-face` block has only variants of your typeface that are bold, the browser will attempt to synthesize a bold web font for you. This synthesized rendering is often sub-par. The same synthesis happens when you want italic, but no italic web font is available. This behavior could be controlled with the [`font-synthesis`](http://stateofwebtype.com/#font-synthesis) property if browsers supported it.

`faux-pas` helps you by logging and reporting these mismatches and faux renderings so that you can fix the offending code.

### Standard rendering of Open Sans

![Standard Open Sans](/docs/normal.png)

### Faux Bold Open Sans

![Faux Bold Open Sans](/docs/faux-bold2.png)

### Faux Italic Open Sans

![Faux Italic Open Sans](/docs/faux-italic.png)

## Installation

Available on npm as `fg-faux-pas`:

```
npm install --save-dev fg-faux-pas
```

## Usage

* Bookmarklet: Get the bookmarklet at the [demo page](https://filamentgroup.github.io/faux-pas/dist/demo.html). Drag it to your bookmarklets and use where needed. By default it highlights elements on your page but check the console for more output.
* Recommended: Include in your pattern library build. Include both `faux-pas.js` and `faux-pas.init.js` (tip: use your own init file to change configuration options).
* Also on the command line: [`node-faux-pas`](https://github.com/filamentgroup/node-faux-pas)

## Options

* `console: true`: uses `console` to output full logging information (warnings for mismatched elements and errors for faux rendering).
* `highlights: true`: adds a specific style to mismatched/faux elements on the page for visual inspection.
* `mismatches: true`: a mismatch may not be a faux rendering even though it’s a misconfiguration—this option allows you to disable these warnings.

## Browser Support

Anything that supports the [CSS Font Loading API](http://caniuse.com/#feat=font-loading):

* Google Chrome 35+
* Opera 22+
* Firefox 41+
* Safari 10+
* Mobile Safari 10+
* Android Chromium WebView
* Chrome for Android
* _and others_

## Build

Use `gulp` to generate a new docs HTML file (automatically updates the bookmarklet with the latest code).
