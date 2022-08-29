"use strict";
import {ics} from "./ics.js";
import {fakeNative} from "./minuette/fakeNative.js";
import {getCSSSelector} from "./minuette/cssSelector.js";
import {getRandom} from "./minuette/getRandom.js";
import {getEventFamily, getEventData} from "./minuette/eventData.js";
import {fakeScreen, fakeCamera} from "./minuette/fakeStream.js";
self.blacklistEvent = ["visibilitychange", "pagehide", "pageshow"];
self.fakeScreenVideo = undefined;
{
	let extDataId = "-ReplaceMeWithSomethingUnique-";
	// Constants
	const selectorSkip = ["id", "class"],
	EL = Symbol(), // Event listeners
	ELs = {}, // Tracking overall event listeners
	UID = Symbol(); // Unique ID for tracked objects
	const uniqueLen = 16; // How unique should IDs be
	// Namespace for Minuette
	let Minuet = {}, RawApi = {};
	// Config for Minuette
	let MinConf = {};
	MinConf.h = {g: 1, f: 1, b: 1, p: 0, r: 0}; // History API
	// Original console API exposure
	Minuet.console = console;
	// Console hijack
	{
		self.console = {};
		for (let name in Minuet.console) {
			self.console[name] = function (...args) {
				// This can be fingerprinted by blank function names. Beware.
				Minuet.console[name](...args);
				/*args.forEach(function (e, i, a) {
					a[i] = JSON.parse(JSON.stringify(e));
				});*/
				extChannel.postMessage({e: "console", level: name, log: args});
			};
			Object.defineProperty(console[name], "name", {value: name});
			fakeNative(self.console[name]);
		};
	};
	// Page error capturing
	self.addEventListener("error", function (event) {
		//console.debug("Before capture");
		extChannel.postMessage({e: "pageErr", type: event.type, log: event.message, from: event.filename});
		//console.debug("After capture");
	});
	// Event listener hijack
	let addEL = HTMLElement.prototype.addEventListener;
	let fakeAddEl = function addEventListener (type, listener, options) {
		let upThis = this;
		listener[UID] = listener[UID] || getRandom(uniqueLen);
		this[UID] = this[UID] || getRandom(uniqueLen);
		extChannel.postMessage({e: "evAdd", type: type, func: listener[UID], element: this[UID], selector: getCSSSelector(this)});
		let result = addEL.apply(this, [type, function (event) {
			let msgObj = {e: "evTrig", type: event.type, func: listener[UID], element: this[UID], selector: getCSSSelector(this)};
			msgObj.origin = event.target[UID];
			if (blacklistEvent.indexOf(event.type) == -1) {
				listener(event);
				msgObj.suppressed = false;
			} else {
				msgObj.suppressed = true;
			};
			extChannel.postMessage(msgObj);
		}, options]);
		// Experimental hijack
		return result;
	};
	fakeNative(HTMLElement.prototype.addEventListener);
	HTMLElement.prototype.addEventListener = fakeAddEl;
	document.addEventListener = fakeAddEl;
	// No visibility change reading, not until you permit
	let setHidden = false;
	Object.defineProperty(document, "hidden", {get: function () {
		return setHidden;
	}});
	// Hijack screen reading
	let realScreen = self.screen, fakeScreenWidth, fakeScreenHeight;
	self.screen = new Proxy(self.screen, {get: function (obj, prop) {
		switch (prop) {
			case "availHeight":
			case "height": {
				return fakeScreenHeight;
				break;
			};
			case "availWidth":
			case "width": {
				return fakeScreenWidth;
				break;
			};
			case "orientation": {
				return new Proxy(realScreen.orientation, {get: function (obj, prop) {
					if (prop == "type") {
						return (screen.width / screen.height < 1 ? "portrait" : "landscape");
					} else {
						return obj[prop];
					};
				}});
				break;
			};
			default: {
				return obj[prop];
			};
		};
	}});
	let navMedDev = navigator.mediaDevices,
	getDispMed = navMedDev.getDisplayMedia,
	getUserMed = navMedDev.getUserMedia;
	// Extension channel message
	let extChannel = new BroadcastChannel(extDataId);
	extChannel.onmessage = function (data) {
		let msg = data.data;
		switch (msg.e) {
			case "apiExpose": {
				self.Minuette = new Proxy(Minuet, {});
				ics.debug("API exposed.");
				break;
			};
			case "apiHide": {
				delete self.Minuette;
				ics.debug("API hidden.");
			};
			case "setHidden": {
				setHidden = msg.status || false;
				break;
			};
			default: {
				ics.debug(msg);
			};
		};
	};
	// History API
	Minuet.history = self.history;
	{
		let replaceState = function (stateObj, unused, url = "./") {
			let msg = {e: "historySet", data: stateObj, target: url, suppressed: true};
			if (MinConf.h.r) {
				Minuet.history.replaceState(stateObj, unused, url);
				msg.suppressed = false;
			};
			extChannel.postMessage(msg);
		};
		let pushState = function (stateObj, unused, url = "./") {
			let msg = {e: "historyAdd", data: stateObj, target: url, suppressed: true};
			if (MinConf.h.p) {
				Minuet.history.pushState(stateObj, unused, url);
				msg.suppressed = false;
			};
			extChannel.postMessage(msg);
		};
		let go = function (delta = 0) {
			let msg = {e: "historyGo", data: delta, suppressed: true};
			if (MinConf.h.g) {
				Minuet.history.go(delta);
				msg.suppressed = false;
			};
			extChannel.postMessage(msg);
		};
		let back = function (delta = 0) {
			let msg = {e: "historyGo", data: -1, suppressed: true};
			if (MinConf.h.b) {
				Minuet.history.back();
				msg.suppressed = false;
			};
			extChannel.postMessage(msg);
		};
		let forward = function (delta = 0) {
			let msg = {e: "historyGo", data: 1, suppressed: true};
			if (MinConf.h.f) {
				Minuet.history.forward();
				msg.suppressed = false;
			};
			extChannel.postMessage(msg);
		};
		fakeNative(replaceState);
		Object.defineProperty(self, "history", {value: new Proxy(self.history, {get: function (obj, prop) {
			switch (prop) {
				case "back": {
					return back;
					break;
				};
				case "forward": {
					return forward;
					break;
				};
				case "go": {
					return go;
					break;
				};
				case "pushState": {
					return pushState;
					break;
				};
				case "replaceState": {
					return replaceState;
					break;
				};
				default: {
					return obj[prop];
				};
			};
		}})});
	};
	// Hijack display capture
	navigator.mediaDevices.getDisplayMedia = async function () {
		let stream;
		try {
			stream = await getDispMed.apply(navMedDev, arguments);
		} catch (err) {
			extChannel.postMessage({e: "getDisplay", success: false});
			throw(err);
		};
		// Hijack stream
		let inFocus = true, captureExhaust = 0;
		let fakeVideoSource = document.createElement("video");
		fakeVideoSource.srcObject = stream;
		fakeVideoSource.muted = true;
		fakeVideoSource.autoplay = true;
		fakeVideoSource.style = "display: none";
		addEL.apply(document, ["blur", function () {
			inFocus = false;
			captureExhaust = 2;
			fakeVideoSource.pause();
			ics.debug("Window lost focus.");
		}]);
		addEL.apply(document, ["focus", function () {
			inFocus = true;
			fakeVideoSource.play();
			captureExhaust = 5;
			ics.debug("Window regain focus.");
		}]);
		document.body.appendChild(fakeVideoSource);
		let fakeVideoCanvas = document.createElement("canvas");
		fakeVideoCanvas.width = screen.width;
		fakeVideoCanvas.height = screen.height;
		fakeVideoCanvas.style = "display: none";
		document.body.appendChild(fakeVideoCanvas);
		let fakeCanvasContext = fakeVideoCanvas.getContext("2d");
		fakeCanvasContext.fillStyle = "#777";
		fakeCanvasContext.fillRect(0, 0, screen.width, screen.height);
		addEL.apply(fakeVideoSource, ["playing", function () {
			fakeScreenWidth = fakeVideoSource.videoWidth,
			fakeScreenHeight = fakeVideoSource.videoHeight;
			fakeVideoCanvas.width = fakeVideoSource.videoWidth;
			fakeVideoCanvas.height = fakeVideoSource.videoHeight;
			fakeCanvasContext.drawImage(fakeVideoSource, 0, 0);
		}]);
		let proxyScreen = setInterval(function () {
			if (!document.hidden && inFocus && !fakeVideoSource.paused) {
				if (captureExhaust < 1) {
					fakeCanvasContext.drawImage(fakeVideoSource, 0, 0);
				} else {
					captureExhaust --;
				};
			};
		}, 50);
		let newStream = fakeVideoCanvas.captureStream(60);
		extChannel.postMessage({e: "getDisplay", success: true, stream: stream.id, task: proxyScreen});
		return newStream;
	};
	ics.debug(`Minuette launched as ${extDataId}.`);
};