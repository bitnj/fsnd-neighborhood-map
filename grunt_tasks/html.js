module.exports = function(grunt, config) {

    /* configure tasks */
    grunt.config.merge({
        htmllint: {
            options: {force: true},
            src: [config.srcRoot + '*.html']
        }
    });
};
