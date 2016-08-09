var gulp        = require('gulp');
// var gutil       = require('gulp-util');
// var bowerMain   = require('bower-main');
// var del         = require('del');
// var concat      = require("gulp-concat");
// var uglify      = require("gulp-uglify");
// var rename      = require("gulp-rename");
var sass        = require("gulp-sass");
// var cssnano     = require("gulp-cssnano");
// var babel       = require("gulp-babel");
// var usemin      = require('gulp-usemin');

// Auto

gulp.task('sass', function() {
    return gulp.src('assets/css/*.scss')
                .pipe(sass.sync().on('error', sass.logError))
                //.pipe(cssnano())
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

// gulp.task("replace-html", function() {
//     return gulp.src("client/index.html")
//                 .pipe(usemin({
//                     js: [
//                         babel({ presets: ['es2015'] }),
//                         uglify()
//                     ],
//                     libjs: [
//                         uglify({ mangle: false, compress: false })
//                     ]
//                 }))
//                 .pipe(gulp.dest("client/"));
// });

// gulp.task("prod", [ "replace-html" ]);
