#!/bin/bash
mkdir -p build
rm -rv build/*
cp -r manifest.json build
cp -r libs build
cp -r LICENSE build
cp -r _locales build
cp -r ui build
mkdir -p build/svc
esbuild --bundle svc/ics.js --bundle svc/monitor.js --outdir=build/svc --sourcemap --watch --minify-whitespace --minify-syntax
exit
