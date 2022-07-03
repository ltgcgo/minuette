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
echo Building JS and CSS files...
mkdir -p build/ui/js
ls -1 js | while IFS= read -r jsf ; do
	esbuild --bundle "js/${jsf}/index.js" --outfile=build/ui/js/${jsf}.js --minify
done
mkdir -p build/ui/css
ls -1 js | while IFS= read -r jsf ; do
	esbuild --bundle "css/${jsf}/index.css" --outfile=build/ui/css/${jsf}.css --minify
done
mkdir -p build/svc
esbuild --bundle svc/ics.js --bundle svc/monitor.js --outdir=build/svc --minify
echo Packing into ZIP files...
mkdir -p dist
rm -rfv dist/*
cd build
zip -r9v ../dist/minuette_mfv2.zip ./*
cd ..
echo Build finished.
exit