var gulp = require('gulp');
var bower = require('gulp-bower');
var rename = require('gulp-rename');
var runSequence = require('run-sequence');

gulp.task('default', function (callback) {
    runSequence('bower', 'copydeps', callback);
});

gulp.task('bower', function () {
    return bower();
});

gulp.task('copydeps', function () {
    gulp.src('./bower_components/simperium/index.1')
        .pipe(rename('simperium-0.1.min.js'))
        .pipe(gulp.dest('./assets'));

    gulp.src('./bower_components/bulma/css/bulma.min.css')
        .pipe(gulp.dest('./assets'));

    gulp.src('./bower_components/bluebird/js/browser/bluebird.min.js')
        .pipe(gulp.dest('./assets'));

    gulp.src('./bower_components/triplesec/browser/triplesec.js')
        .pipe(gulp.dest('./assets'));
});

gulp.task('dist', function () {

});

gulp.task('release', function () {

});