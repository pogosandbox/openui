var gulp        = require('gulp');
var uglify      = require("gulp-uglify");
var rename      = require("gulp-rename");
var sass        = require("gulp-sass");
var cssnano     = require("gulp-cssnano");
var babel       = require("gulp-babel");
var usemin      = require('gulp-usemin');

// Auto

gulp.task('sass', function() {
    return gulp.src('assets/css/*.scss')
                .pipe(sass.sync().on('error', sass.logError))
                .pipe(cssnano())
                .pipe(gulp.dest(function(f) {
                    return f.base;
                }));
});

gulp.task("watch-sass", function() {
   gulp.watch('assets/css/*.scss', ['sass']); 
});

gulp.task("watch", [ "watch-sass" ]);

// Main tasks

gulp.task('default', [ "sass" ]);

// Prod

gulp.task("indexhtml", function() {
    return gulp.src("index.htm")
           .pipe(rename("index.html"))
           .pipe(gulp.dest("."));
});

gulp.task("replace-html", ["indexhtml"], function() {
    return gulp.src("index.html")
                .pipe(usemin({
                    js: [
                        babel({ presets: ['es2015'] }),
                        uglify()
                    ]
                }))
                .pipe(gulp.dest("."));
});

gulp.task("prod", [ "sass", "indexhtml", "replace-html" ]);
