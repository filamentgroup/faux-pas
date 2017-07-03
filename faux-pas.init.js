// Initialization
(function() {
	// first argument is a window or an HTMLElement node
	var FP = new FauxPas( window, {
		console: true,
		highlights: true,
		mismatches: true
	});

	FP.compare();
})();