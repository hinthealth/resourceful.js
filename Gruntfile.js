path = require('path');
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    src: [
      'src/**/*'
    ],
    dist: 'dist/resourceful.js',

    bower: {
      install: {
        options: {
          copy: false,
          install: true
        }
      }
    },
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: "<%= src %>",
        dest: "<%= dist %>",
      }
    },
    uglify: {
      options: {
        // the banner is inserted at the top of the output
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          "<%= dist %>.min": ["<%= dist %>"]
        }
      }
    },
    karma: {
      watch: {
        configFile: 'test/karma.conf.js',
        runnerPort: 9090,
        background: true // Uses grunt-contrib-watch
      },
      test: {
        configFile: 'test/karma.conf.js',
        runnerPort: 9090,
        singleRun: true,
        browsers: ['PhantomJS']
      }
    },
    watch: {
      karma: {
        files: ['src/**/*.js', 'test/**/*.js'],
        tasks: ['karma:watch:run']
      }
    }
  });

  // Load grunt plugins
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-karma');

  // Default task(s).
  grunt.registerTask('install', ['bower:install', 'build']);
  grunt.registerTask('build', ['concat:dist', 'uglify:dist']);
  grunt.registerTask('test', ['karma:test']);
  grunt.registerTask('default', ['install', 'test']);

};
