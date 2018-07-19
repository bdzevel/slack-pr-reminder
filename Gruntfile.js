module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    eslint: {
      options: {
        config: '.eslintrc.js',
      },
      src: [ '.' ],
    },
  });

  grunt.loadNpmTasks('gruntify-eslint');

  grunt.registerTask('test', [ 'eslint' ]);
  grunt.registerTask('default', [ 'eslint' ]);
};
