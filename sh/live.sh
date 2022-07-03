#!/bin/bash
echo Cleaning up previous build results...
mkdir -p build
rm -r build/*
echo Copying static files...
cp -r manifest.json build
cp -r libs build
cp -r LICENSE build
cp -r _locales build
cp -r ui build
echo Building JS and CSS files for UI...
mkdir -p build/ui/js
ls -1 js | while IFS= read -r jsf ; do
	esbuild --bundle "js/${jsf}/index.js" --outfile=build/ui/js/${jsf}.js --sourcemap --minify-whitespace --minify-syntax
done
mkdir -p build/ui/css
ls -1 js | while IFS= read -r jsf ; do
	esbuild --bundle "css/${jsf}/index.css" --outfile=build/ui/css/${jsf}.css --sourcemap --minify
done
echo Live rebuilding injection services...
mkdir -p build/svc
esbuild --bundle svc/ics.js --bundle svc/monitor.js --outdir=build/svc --sourcemap --watch --minify-whitespace --minify-syntax
exit
