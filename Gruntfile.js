module.exports = function(grunt) {

    // load plugins need to complete our tasks
    grunt.loadNpmTasks('grunt-contrib-uglify');
    
    
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        // create minified versions of the JavaScript files
        uglify: {
            build: {
                src: 'js/foo.js',
                dest: 'js/foo.min.js'
            }
        }
    });


    // Tasks to be run when Grunt called with no specific task
    grunt.registerTask('default', ['uglify']);
