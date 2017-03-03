const _ = require('lodash');

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        bower_concat: {
            all: {
                dest: {
                    'js': 'public/js/_bower.js',
                    'css': 'public/stylesheets/_bower.css',
                    'fontsDir': 'public/stylesheets/fonts',
                },
                dependencies: {
                    'underscore': 'jquery',
                    'backbone': 'jquery',
                },
                bowerOptions: {
                    relative: false
                }
            }
        }, copy: {
            main: {
                files: [
                    // includes files within path
                    {
                        expand: true,
                        src: ['fonts/roboto/*'],
                        cwd: 'bower_components/materialize/',
                        dest: 'public/',
                        filter: 'isFile'
                    },
                ],
            },
        },
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-bower-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task(s).
    grunt.registerTask('default', ['bower_concat', "copy"]);
};