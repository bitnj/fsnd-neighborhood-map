module.exports = function (grunt) {

    /* yml file containing all project directories */
    var config = grunt.file.readYAML('Gruntconfig.yml');

    /* load all dependencies */
    require('load-grunt-tasks')(grunt);

    /* configure grunt tasks - load from separate files to keep it modular
     * even though its overkill for this project */
    require('./grunt_tasks/html.js')(grunt, config);
    require('./grunt_tasks/javascript.js')(grunt, config);
    require('./grunt_tasks/general.js')(grunt, config);
    

    /* Tasks to be run when Grunt called with no specific task */
    grunt.registerTask('default', ['mkdir',
            'clean',
            'uglify',
            'htmllint',
            'jshint', 'copy']);

};
