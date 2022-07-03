#!/bin/bash
mkdir -p build
# Remove the dev files
rm -rv build/*
# Using esbuild to build all JS files
es