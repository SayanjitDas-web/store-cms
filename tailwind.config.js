/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/views/**/*.{ejs,js,html}",
        "./plugins/**/views/**/*.{ejs,js,html}",
        "./plugins/**/*.js",
        "./src/public/js/**/*.js",
        "./src/routes/**/*.js"
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
