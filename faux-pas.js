(function(root, factory) {
	if (typeof exports === "object" && typeof exports.nodeName !== "string") {
		// CommonJS
		module.exports = factory();
	} else {
		// Browser
		root.FauxPas = factory();
	}
})(this, function() {
	// https://www.w3.org/TR/css-fonts-3/#font-matching-algorithm
	// TODO font-stretch
	// TODO font-style: oblique
	var projectName = "faux-pas";

	var ReportLine = function(level, message, element) {
		this.level = level;
		this.message = message;
		this.element = element;
		this.output = this.toString();
	};

	ReportLine.prototype.isError = function() {
		return this.level === "error";
	};

	ReportLine.prototype.isWarning = function() {
		return this.level === "warn";
	};

	ReportLine.prototype.printElement = function() {
		// return "<" + this.element.tagName + " class=\"" + this.element.className + "\">";
		return this.element ? this.element.outerHTML.replace(/ style\=\"[^\"]*\"/, "") : "";
	};

	ReportLine.prototype.toString = function() {
		var el = this.printElement();
		return projectName + " " + this.level + ": " + this.message + (el ? " " + el : "");
	};
	ReportLine.prototype.console = function() {
		if (this.element) {
			console[this.level](this.message, this.element);
		} else {
			console[this.level](this.message);
		}
	};

	var Report = function() {
		this.title = projectName + " Results";
		this.lines = [];
		this.errorCount = 0;
		this.warningCount = 0;
		this.declaredCount = 0;
		this.usedCount = 0;
	};

	Report.prototype.log = function(message, element) {
		this.lines.push(new ReportLine("log", message, element));
	};

	Report.prototype.warn = function(message, element) {
		this.lines.push(new ReportLine("warn", message, element));
		this.warningCount++;
	};

	// Add a warning but don’t increment the mismatch count
	Report.prototype.silentWarn = function(message, element) {
		this.lines.push(new ReportLine("warn", message, element));
	};

	Report.prototype.error = function(message, element) {
		this.lines.push(new ReportLine("error", message, element));
		this.errorCount++;
	};

	Report.prototype.getLines = function() {
		return this.lines;
	};

	Report.prototype.printConsole = function() {
		console.group(this.title);

		this.getLines().forEach(function(line) {
			line.console();
		});

		console.groupEnd();
	};

	Report.prototype.print = function() {
		return this.lines.map(function(line) {
			return line.toString();
		});
	};

	Report.prototype.getErrorCount = function() {
		return this.errorCount;
	};

	Report.prototype.getWarningCount = function() {
		return this.warningCount;
	};

	Report.prototype.getPluralLabel = function(count, singularLabel, pluralLabel) {
		return count !== 1 ? (pluralLabel ? pluralLabel : singularLabel + "s") : singularLabel;
	};

	// used for testing
	Report.prototype.setDeclaredCount = function(declaredCount) {
		this.declaredCount = declaredCount;
	};

	Report.prototype.setUsedCount = function(usedCount) {
		this.usedCount = usedCount;
	};

	/*
	 * Font
	 */
	var Font = function(family, weight, style, report) {
		this.family = Font.normalizeFamily(family);
		this.weight = this.normalizeWeight(weight) || "400";
		this.style = style || "normal";
		this.report = report;
	};

	Font.normalizeFamily = function(family) {
		return family.replace(/[\'\"]/g, "").toLowerCase();
	};

	Font.prototype.normalizeWeight = function(weight) {
		var weightLookup = {
			normal: "400",
			bold: "700"
		};

		// lighter and bolder not supported
		if (weight === "lighter" || weight === "bolder") {
			this.report.silentWarn("lighter and bolder weights are not supported.");
		}

		return "" + (weightLookup[weight] || weight);
	};

	Font.prototype.toString = function() {
		return this.family + "||" + this.weight + "||" + this.style;
	};

	/*
	 * FontSet, a set of fonts
	 */
	var FontSet = function() {
		this.allowDuplicates = false;
		this.familyDuplicatesHash = {};
		this.duplicatesHash = {};
		this.fonts = [];
	};

	FontSet.prototype.length = function() {
		return this.fonts.length;
	};

	FontSet.prototype.add = function(font) {
		if (!this.allowDuplicates && this.has(font)) {
			return;
		}

		this.familyDuplicatesHash[font.family] = true;
		this.duplicatesHash[font] = true;
		this.fonts.push(font);
	};

	FontSet.prototype.has = function(font) {
		return font in this.duplicatesHash;
	};

	FontSet.prototype.hasFamily = function(family) {
		family = Font.normalizeFamily(family);
		return family in this.familyDuplicatesHash;
	};

	FontSet.prototype.get = function(family) {
		if (!family) {
			return this.fonts;
		}

		var fonts = [];
		this.fonts.forEach(function(font) {
			if (font.family === family) {
				fonts.push(font);
			}
		});

		return fonts;
	};

	FontSet.prototype.getStats = function(family) {
		var stats = [];
		this.get(family).forEach(function(font) {
			var stat = {};
			var weightNum = parseInt(font.weight, 10);
			var isLighter = weightNum <= 500;
			var isBolder = weightNum >= 600;

			stat.style = font.style;
			stat.weight = weightNum;
			stat.bolder = isBolder;

			stats.push(stat);
		});

		return stats;
	};

	FontSet.prototype._hasStat = function(stats, callback) {
		var hasIt = false;
		stats.forEach(function(stat) {
			if (callback(stat)) {
				hasIt = true;
			}
		});
		return hasIt;
	};

	FontSet.prototype.statsHasRegular = function(stats) {
		return this._hasStat(stats, function(stat) {
			return !stat.bolder && stat.style === "normal";
		});
	};
	FontSet.prototype.statsHasItalic = function(stats) {
		return this._hasStat(stats, function(stat) {
			return !stat.bolder && stat.style === "italic";
		});
	};
	FontSet.prototype.statsHasBold = function(stats) {
		return this._hasStat(stats, function(stat) {
			return stat.bolder && stat.style === "normal";
		});
	};
	FontSet.prototype.statsHasBoldItalic = function(stats) {
		return this._hasStat(stats, function(stat) {
			return stat.bolder && stat.style === "italic";
		});
	};

	/*
	 * FauxPas, highlights elements that are font-synthesized
	 */

	var FauxPas = function(win, options) {
		if (!("fonts" in win.document)) {
			throw Error(
				projectName + " requires the CSS Font Loading API, which your browser does not support."
			);
		}

		options = options || {};

		this.showMismatches = options.mismatches !== undefined ? options.mismatches : true;
		this.highlightElements = options.highlights !== undefined ? options.highlights : true;
		this.consoleOutput = options.console !== undefined ? options.console : true;

		this.report = new Report();

		this.win = win;
		this.doc = win.document;

		this.usedFontsElements = {};
		this.usedFontSet = new FontSet();
		this.declaredFontSet = new FontSet();
	};

	FauxPas.prototype.addUsedFontElement = function(font, element) {
		var hasTextChildren = false;
		Array.prototype.slice.call(element.childNodes).forEach(function(el) {
			if (el.nodeType === 3) {
				hasTextChildren = true;
			}
		});

		if (!(font in this.usedFontsElements)) {
			this.usedFontsElements[font] = [];
		}

		if (hasTextChildren) {
			this.usedFontsElements[font].push(element);
		}
	};

	FauxPas.prototype._getStyle = function(element, property) {
		var css = this.win.getComputedStyle(element, null);
		return css.getPropertyValue(property);
	};

	FauxPas.prototype._getStyles = function(element, properties) {
		var css = this.win.getComputedStyle(element, null);
		var styles = {};
		properties.forEach(function(property) {
			styles[property] = css.getPropertyValue(property);
		});
		return styles;
	};

	FauxPas.prototype.generate = function() {
		this.generateDeclaredList();
		this.generateUsedList();

		var declaredCount = this.declaredFontSet.length();
		var usedCount = this.usedFontSet.length();
		this.report.log(
			declaredCount + " " +
			this.report.getPluralLabel(declaredCount, "web font") + " declared and " +
			usedCount + " " +
			this.report.getPluralLabel(usedCount, "web font") + " used."
		);
		this.report.setDeclaredCount(declaredCount);
		this.report.setUsedCount(usedCount);

		// Warnings
		if (!declaredCount) {
			this.report.silentWarn("No web fonts were found!");
		} else if (!usedCount) {
			this.report.silentWarn("You didn’t actually use any web fonts here!");
		} else if (declaredCount !== usedCount) {
			// TODO report which web fonts are unused.
			this.report.silentWarn(
				"There are unused @font-face blocks here, are you sure you need them all?"
			);
		}
	};

	FauxPas.prototype.generateUsedList = function() {
		Array.prototype.slice.call(this.doc.getElementsByTagName("*")).forEach(
			function(el) {
				var styles = this._getStyles(el, ["font-family", "font-weight", "font-style"]);
				var families = styles["font-family"].split(",");

				families.forEach(
					function(family) {
						family = family.trim();

						var font = new Font(family, styles["font-weight"], styles["font-style"], this.report);

						// Leaky assumption, we use all webfonts declared in the stack
						// (see generatedDeclaredList note about error status)
						// Especially when some type foundaries use two separate web fonts as “DRM”
						// TODO Reality: only web fonts with valid unicodes in the content will be used.
						if (!this.isWebFont(font)) {
							// Only web fonts will faux.
							return;
						}

						this.usedFontSet.add(font);
						this.addUsedFontElement(font, el);
					}.bind(this)
				);
			}.bind(this)
		);
	};

	FauxPas.prototype.generateDeclaredList = function() {
		this.doc.fonts.forEach(
			function(font) {
				// We want to ignore errored font-face blocks, especially if multiple web fonts are listed in the same used font-family stack on an element.
				if (font.status === "error") {
					this.report.error("One of your web fonts didn’t load due to an error: " + font.family);
				} else {
					this.declaredFontSet.add(new Font(font.family, font.weight, font.style));
				}
			}.bind(this)
		);
	};

	FauxPas.prototype.isWebFont = function(font) {
		return this.declaredFontSet.hasFamily(font.family);
	};

	FauxPas.prototype.isWebFontMismatch = function(font) {
		return !this.declaredFontSet.has(font);
	};

	FauxPas.prototype.isFauxWebFont = function(font) {
		// exact match
		if (this.declaredFontSet.has(font)) {
			return false;
		}

		var isFaux = false;
		var stats = this.declaredFontSet.getStats(font.family);
		var wantsItalic = font.style === "italic";
		var wantsBold = parseInt(font.weight, 10) >= 600;

		var hasRegular = this.declaredFontSet.statsHasRegular(stats);
		var hasBold = this.declaredFontSet.statsHasBold(stats);
		var hasItalic = this.declaredFontSet.statsHasItalic(stats);
		var hasBoldItalic = this.declaredFontSet.statsHasBoldItalic(stats);

		// console.log( font.family, wantsBold, wantsItalic, 'has: ', hasRegular, hasBold, hasItalic, hasBoldItalic );
		if (wantsBold && wantsItalic) {
			return !hasBoldItalic;
		} else if (wantsBold && hasBoldItalic && !hasBold) {
			return hasRegular;
		} else if (wantsItalic && hasBoldItalic) {
			return false;
		} else if (wantsItalic && !hasItalic) {
			return true;
		} else if (wantsBold && !hasBold) {
			return true;
		}

		return false;
	};

	FauxPas.prototype._addHighlights = function(elements, bgColor) {
		elements.forEach(function(element) {
			element.style["background-color"] = bgColor;
		});
	};

	FauxPas.prototype._log = function(elements, str, method) {
		elements.forEach(
			function(element) {
				this.report[method](str + " (" + this._getStyle(element, "font-family") + ")", element);
			}.bind(this)
		);
	};

	FauxPas.prototype.logFaux = function(elements) {
		if (this.highlightElements) {
			this._addHighlights(elements, "#eb160e");
		}

		this._log(elements, "Faux font detected", "error");
	};

	FauxPas.prototype.logMismatch = function(elements) {
		if (this.highlightElements) {
			this._addHighlights(elements, "#fcc");
		}

		this._log(elements, "Mismatched font detected", "warn");
	};

	FauxPas.prototype.findAllFauxWebFonts = function() {
		this.generate();

		this.usedFontSet.get().forEach(
			function(font) {
				if (this.isWebFont(font)) {
					if (this.isFauxWebFont(font)) {
						this.logFaux(this.usedFontsElements[font]);
					} else if (this.showMismatches && this.isWebFontMismatch(font)) {
						this.logMismatch(this.usedFontsElements[font]);
					}
				}
			}.bind(this)
		);
	};

	FauxPas.prototype.compare = function() {
		this.findAllFauxWebFonts();

		if (this.consoleOutput) {
			this.report.printConsole();
		}
	};

	FauxPas.prototype.getReport = function() {
		return this.report;
	};

	return FauxPas;
});
