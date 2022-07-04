"use strict";
import {ics} from "./ics.js";
import {fakeNative} from "./minuette/fakeNative.js";
import {getCSSSelector} from "./minuette/cssSelector.js";
import {getRandom} from "./minuette/getRandom.js";
import {getEventFamily, getEventData} from "./minuette/eventData.js";
import {fakeScreen, fakeCamera} from "./minuette/fakeStream.js";
self.blacklistEvent = ["visibilitychange"];
self.fakeScreenVideo = undefined;
{
	// Constants
	const selectorSkip = ["id", "class"],
	EL = Symbol(), // Event listeners
	ELs = {}, // Tracking overall event listeners
	UID = Symbol(); // Unique ID for tracked objects
	const uniqueLen = 16; // How unique should IDs be
	// Namespace for Minuette
	let Minuet = {}, RawApi = {};
	// Original console API exposure
	Minuet.console = console;
	// Console hijack
	{
		self.console = {};
		for (let name in Minuet.console) {
			self.console[name] = function () {
				// This can be fingerprinted by blank function names. Beware.
				extChannel.postMessage({e: "console", level: name, log: Array.from(arguments)});
				Minuet.console[name](...arguments);
			};
			fakeNative(self.console[name]);
		};
	};
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
	/*screen.orientation = */
	let navMedDev = navigator.mediaDevices,
	getDispMed = navMedDev.getDisplayMedia,
	getUserMed = navMedDev.getUserMedia;
	// Extension channel message
	let extChannel = new BroadcastChannel("-ReplaceMeWithSomethingUnique-");
	extChannel.onmessage = function (msg) {
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
			default: {
				ics.debug(msg);
			};
		};
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
};
ics.debug("Minuette launched.");