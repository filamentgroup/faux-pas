var fs = require( "fs" );
var gulp = require( "gulp" );
var template = require( "gulp-template" );
var bookmarkletify = require( "bookmarkletify" );

// Insert new bookmarklet into docs file
gulp.task( "default", function() {
	var fauxpas = fs.readFileSync( "faux-pas.js", "utf-8" );
	var fauxpasinit = fs.readFileSync( "faux-pas.init.js", "utf-8" );
	var pkg = JSON.parse( fs.readFileSync( "package.json" ), "utf-8" );

	gulp.src( "./docs/demo.html" )
		.pipe( template({
				version: pkg.version,
				bookmarklet: bookmarkletify( fauxpas + fauxpasinit )
			}) )
		.pipe( gulp.dest( "./dist/" ) );
});