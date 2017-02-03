module.exports = function(grunt, config) {

    /* configure tasks */
    grunt.config.merge({
        /* clean the dist directory before copying updated files */
        clean: {
            release: [config.distImagesDir + '*.png',
            config.distCSSDir + '*.css',
            config.distJSDir + '*.js']
        },

        /* make directories if they don't already exist on the dist side */
        mkdir: {
            release: {
                options: {
                    create: [ 
                        config.distRoot + 'img',
                        config.distRoot + 'css',
                        config.distRoot + 'js']
                }
            }
        },

        /* copy required files to the appropriate dist directory */
        copy: {
            release: {
                files: [{
                    expand: true,
                    cwd: config.srcRoot,
                    src: '**',
                    dest: config.distRoot,
                    filter: 'isFile'}]
            }
        }
    });
};
