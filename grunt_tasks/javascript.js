module.exports = function(grunt, config) {

    /* configure tasks */
    grunt.config.merge({
        pkg: grunt.file.readJSON('package.json'),
        
        jshint: {
            all: [config.srcJSDir + 'app.js']
        },
        
        /* create minified versions of the javascript */
        
        uglify: {
            options: {
                banner: '/*! <%= pkg.main %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: config.srcJSDir  + '*.js',
                dest: config.distJSDir + '<%= pkg.main %>.min.js'
            }
        }
    });
};
