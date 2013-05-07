"use strict";
module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: "<json:package.json>",
		meta: {
			banner: "/*! <%= pkg.name %> - v<%= pkg.version %> - " +
				"<%= grunt.template.today('yyyy-mm-dd') %>\n" +
				"<%= pkg.homepage ? '* ' + pkg.homepage + '\n' : '' %>" +
				"* Copyright (c) <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>;" +
				" Licensed <%= _.pluck(pkg.licenses, 'type').join(', '') %> */"
		},
		concat: {
			dist: {
				src: ["<banner:meta.banner>", "<file_strip_banner:lib/<%= pkg.name %>.js>"],
				dest: "dist/<%= pkg.name %>.js"
			}
		},
		min: {
			dist: {
				src: ["<banner:meta.banner>", "<config:concat.dist.dest>"],
				dest: "dist/<%= pkg.name %>.min.js"
			}
		},
		test: {
			files: ["test/**/*.js"]
		},
		lint: {
			files: ["grunt.js", "server.js", "worker.js",
				"config/*.js",
				"tasks/*.js",
				"tests/*.js"
			]
		},
		watch: {
			files: "<config:lint.files>",
			tasks: "lint test"
		},
		jshint: {
			options: JSON.parse(grunt.file.read( ".jshintrc" )),
			globals: {
				exports: true,
				module: false
			}
		},
		uglify: {}
	});

	// Default task.
	grunt.registerTask("default", "lint test concat min");

};