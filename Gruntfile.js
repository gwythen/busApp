module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        requirejs: {
            mainJS: {
                options: {
                    baseUrl: "public/js/app",
                    paths: {
                        "app": "config/Init"
                    },
                    wrap: true,
                    name: "../libs/almond",
                    preserveLicenseComments: false,
                    optimize: "uglify",
                    mainConfigFile: "public/js/app/config/Init.js",
                    include: ["app"],
                    out: "public/js/app/config/Init.min.js"
                }
            },
            mainCSS: {
                options: {
                    optimizeCss: "standard",
                    cssIn: "./public/css/main.css",
                    out: "./public/css/main.min.css"
                }
            }
        },
        compass: {
            dev: {                    // Another target
              options: {
                sassDir: './public/scss',
                cssDir: './public/css',
                fontsDir: './public/fonts'
              }
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'public/js/app/**/*.js', '!public/js/app/**/*min.js'],
            options: {
                globals: {
                    jQuery: true,
                    console: false,
                    module: true,
                    document: true
                }
            }
        },
        watch: {
            sass: {
              options: { livereload: false, spawn:false },
              files: ['public/scss/*.scss'],
              tasks: ['compass']
            },
            css: {
              options: { livereload: true, spawn:false },
              files: ['public/css/*.css'],
              tasks: []
            },
            js: {
              options: { livereload: true, spawn:false },
              files: ['public/js/**/*.js'],
              tasks: ['jshint']
            },
            html: {
                files: ['public/js/app/templates/*.html'],
                options: {
                    livereload: true
                }
            }
          },
    });
    
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.registerTask('test', ['jshint']);
    grunt.registerTask('build', ['requirejs:mainJS', 'requirejs:mainCSS']);
    grunt.registerTask('default', ['test', 'build']);
    grunt.registerTask('default', ['jshint', 'compass']);

};