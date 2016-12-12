;(function() {

	// https://www.w3.org/TR/css-fonts-3/#font-matching-algorithm
	// TODO font-stretch
	// TODO font-style: oblique
	var projectName = "faux-pas";

	/*
	 * Font
	 */
	var Font = function( family, weight, style ) {
		this.family = this.normalizeFamily( family );
		this.weight = this.normalizeWeight( weight ) || "400";
		this.style = style || "normal";
	};

	Font.prototype.normalizeFamily = function( family ) {
		return family.replace( /[\'\"]/g, '' ).toLowerCase();
	};

	Font.prototype.normalizeWeight = function( weight ) {
		var weightLookup = {
			normal: "400",
			bold: "700"
		};

		// lighter and bolder not supported
		if( weight === "lighter" || weight === "bolder" ) {
			console.warn( projectName + ": lighter and bolder weights are not supported." );
		}

		return "" + ( weightLookup[ weight ] || weight );
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

	FontSet.prototype.add = function( font ) {
		if( !this.allowDuplicates && this.has( font ) ) {
			return;
		}

		this.familyDuplicatesHash[ font.family ] = true;
		this.duplicatesHash[ font ] = true;
		this.fonts.push( font );
	};

	FontSet.prototype.has = function( font ) {
		return font in this.duplicatesHash;
	};

	FontSet.prototype.hasFamily = function( family ) {
		return family in this.familyDuplicatesHash;
	};

	FontSet.prototype.get = function( family ) {
		if( !family ) {
			return this.fonts;
		}

		var fonts = [];
		this.fonts.forEach(function( font ) {
			if( font.family === family ) {
				fonts.push( font );
			}
		});

		return fonts;
	};

	FontSet.prototype.getStats = function( family ) {
		var stats = [];
		this.get( family ).forEach(function( font ) {
			var stat = {};
			var weightNum = parseInt( font.weight, 10 );
			var isLighter = weightNum <= 500;
			var isBolder = weightNum >= 600;

			stat.style = font.style;
			stat.weight = weightNum;
			stat.bolder = isBolder;

			stats.push( stat );
		});

		return stats;
	};

	FontSet.prototype._hasStat = function( stats, callback ) {
		var hasIt = false;
		stats.forEach(function( stat ) {
			if( callback( stat ) ) {
				hasIt = true;
			}
		});
		return hasIt;
	};

	FontSet.prototype.statsHasRegular = function( stats ) {
		return this._hasStat( stats, function( stat ) {
			return !stat.bolder && stat.style === "normal";
		});
	};
	FontSet.prototype.statsHasItalic = function( stats ) {
		return this._hasStat( stats, function( stat ) {
			return !stat.bolder && stat.style === "italic";
		});
	};
	FontSet.prototype.statsHasBold = function( stats ) {
		return this._hasStat( stats, function( stat ) {
			return stat.bolder && stat.style === "normal";
		});
	};
	FontSet.prototype.statsHasBoldItalic = function( stats ) {
		return this._hasStat( stats, function( stat ) {
			return stat.bolder && stat.style === "italic";
		});
	};


	/*
	 * FauxPas, highlights elements that are font-synthesized
	 */

	var FauxPas = function( win, options ) {
		if( !( "fonts" in win.document ) ) {
			throw Error( projectName + " requires the CSS Font Loading API, which your browser does not support." );
		}
		options = options || {};

		this.showMismatches = options.mismatches !== undefined ? options.mismatches : true;
		this.highlightElements = options.highlights !== undefined ? options.highlights : true;
		this.consoleOutput = options.console !== undefined ? options.console : true;

		this.win = win;
		this.doc = win.document;

		this.usedFontsElements = {};
		this.usedFontSet = new FontSet();
		this.declaredFontSet = new FontSet();
	};

	FauxPas.prototype.addUsedFontElement = function( font, element ) {
		if( !( font in this.usedFontsElements ) ) {
			this.usedFontsElements[ font ] = [];
		}
		this.usedFontsElements[ font ].push( element );
	};

	FauxPas.prototype._getStyles = function( element, properties ) {
		var css = this.win.getComputedStyle( element, null );
		var styles = {};
		properties.forEach(function( property ) {
			styles[ property ] = css.getPropertyValue( property );
		})
		return styles;
	};

	FauxPas.prototype.generateUsedList = function() {
		Array.prototype.slice.call( this.doc.getElementsByTagName( "*" ) ).forEach(function( el ) {
			var styles = this._getStyles( el, [ "font-family", "font-weight", "font-style" ] );
			var font = new Font( styles[ "font-family" ], styles[ "font-weight" ], styles[ "font-style" ] );
			this.usedFontSet.add( font );
			this.addUsedFontElement( font, el );
		}.bind( this ) );
	};

	FauxPas.prototype.generateDeclaredList = function() {
		this.doc.fonts.forEach(function( font ) {
			this.declaredFontSet.add( new Font( font.family, font.weight, font.style ) );
		}.bind( this ) );
	};

	FauxPas.prototype.isWebFont = function( font ) {
		return this.declaredFontSet.hasFamily( font.family );
	};

	FauxPas.prototype.isWebFontMismatch = function( font ) {
		return !this.declaredFontSet.has( font );
	};

	FauxPas.prototype.isFauxWebFont = function( font ) {
		// exact match
		if( this.declaredFontSet.has( font ) ) {
			return false;
		}

		var isFaux = false;
		var stats = this.declaredFontSet.getStats( font.family );
		var wantsItalic = font.style === "italic";
		var wantsBold = parseInt( font.weight, 10 ) >= 600;

		var hasRegular = this.declaredFontSet.statsHasRegular( stats );
		var hasBold = this.declaredFontSet.statsHasBold( stats );
		var hasItalic = this.declaredFontSet.statsHasItalic( stats );
		var hasBoldItalic = this.declaredFontSet.statsHasBoldItalic( stats );

// console.log( font.family, wantsBold, wantsItalic, 'has: ', hasRegular, hasBold, hasItalic, hasBoldItalic );
		if( wantsBold && wantsItalic ) {
			return !hasBoldItalic;
		} else if( wantsBold && hasBoldItalic && !hasBold ) {
			return hasRegular;
		} else if( wantsItalic && hasBoldItalic ) {
			return false;
		} else if( wantsItalic && !hasItalic ) {
			return true;
		} else if( wantsBold && !hasBold ) {
			return true;
		}

		return false;
	};

	FauxPas.prototype._addHighlights = function( elements, bgColor ) {
		elements.forEach(function( element ) {
			var hasTextChildren = false;
			Array.prototype.slice.call( element.childNodes ).forEach(function( el ) {
				if( el.nodeType === 3 ) {
					hasTextChildren = true;
				}
			});
			if( hasTextChildren ) {
				element.style[ "background-color" ] = bgColor;
			}
		});
	};

	FauxPas.prototype._consoleOutput = function( elements, str, method ) {
		elements.forEach(function( element ) {
			console[ method ]( str, element );
		});
	};

	FauxPas.prototype.logFaux = function( elements ) {
		if( this.highlightElements ) {
			this._addHighlights( elements, "#eb160e" );
		}
		if( this.consoleOutput ) {
			this._consoleOutput( elements, "Faux font detected:", "error" );
		}
	};

	FauxPas.prototype.logMismatch = function( elements ) {
		if( this.highlightElements ) {
			this._addHighlights( elements, "#fcc" );
		}
		if( this.consoleOutput ) {
			this._consoleOutput( elements, "Mismatched font detected:", "warn" );
		}
	};

	FauxPas.prototype.compare = function() {
		var problemsFound = false;
		this.generateDeclaredList();
		this.generateUsedList();

		if( this.consoleOutput ) {
			console.group( projectName + " Results" );
		}

		this.usedFontSet.get().forEach(function( font ) {
			if( this.isWebFont( font ) ) {
				if( this.isFauxWebFont( font ) ) {
					this.logFaux( this.usedFontsElements[ font ] );
					problemsFound = true;
				} else if( this.showMismatches && this.isWebFontMismatch( font ) ) {
					this.logMismatch( this.usedFontsElements[ font ] );
					problemsFound = true;
				}
			}
		}.bind( this ) );

		if( this.consoleOutput ) {
			if( !problemsFound ) {
				console.log( "Everything is working OK!" );
			}
			console.groupEnd();
		}

	};

	var win = typeof window !== "undefined" ? window : this;

	win.FauxPas = FauxPas;
})();