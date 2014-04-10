var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');

gulp.task('scripts', function () {
  return browserify('./js/world.js')
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('./build/js'))
});

gulp.task('html', function () {
  return gulp.src('./*.html')
    .pipe(gulp.dest('./build'))
});

gulp.task('watch', function () {
  gulp.watch('./js', ['scripts']);
  gulp.watch('./*.html', ['html']);
})

gulp.task('default', ['scripts', 'html', 'watch']);
