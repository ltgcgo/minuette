"use strict";
let fakeScreenGetter = function (obj, prop) {
	if (prop != "label") {
		return obj[prop];
	} else {
		return "Primary Monitor"; // This may change due to language or browser. This is on Firefox.
	};
};
// I'm a bummer
let fakeScreen = function (stream) {
	stream.forEach(function (e, i, a) {
		a[i] = new Proxy(e, fakeScreenGetter);
	});
	return stream;
};
let fakeCamera = function (stream) {};

export {
	fakeScreen,
	fakeCamera
};