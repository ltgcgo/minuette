"use strict";
import {ics} from "./ics.js";
import {fakeNative} from "./minuette/fakeNative.js";
import {getCSSSelector} from "./minuette/cssSelector.js";
import {getRandom} from "./minuette/getRandom.js";
import {getEventFamily, getEventData} from "./minuette/eventData.js";
import {fakeScreen, fakeCamera} from "./minuette/fakeStream.js";
import {smartClone} from "./minuette/smartClone.js";
import {errorFilter, stackFilter} from "./minuette/stackFilter.js";
self.blacklistEvent = ["visibilitychange", "pagehide", "pageshow"];
self.fakeScreenVideo = undefined;
{
	let extDataId = "-ReplaceMeWithSomethingUnique-";
	// Constants
	const selectorSkip = ["id", "class"],
	EL = Symbol(), // Event listeners
	ELs = {}, // Tracking overall event listeners
	UID = Symbol(), // Unique ID for tracked objects
	PUID = Symbol(); // Reference of the parent
	const uniqueLen = 16; // How unique should IDs be
	// Namespace for Minuette
	let Minuet = {}, RawApi = {};
	// Config for Minuette
	let MinConf = {};
	MinConf.h = {g: 1, f: 1, b: 1, p: 1, r: 1}; // History API
	// Original console API exposure
	RawApi.console = console;
	// Console hijack
	{
		self.console = {};
		for (let name in RawApi.console) {
			self.console[name] = function (...args) {
				RawApi.console[name](...args);
				args.forEach(function (e, i, a) {
					a[i] = smartClone(e);
				});
				let stacked = (new Error("")).stack.split("\n");
				stacked.shift();
				stacked = stacked.slice(0, 2);
				stacked.forEach((e, i, a) => {
					a[i] = stackFilter(e);
				});
				RawApi.console.debug.call(RawApi.console, `At: ${stacked.join("\n    ")}`);
				extChannel.postMessage({e: "console", level: name, log: args, from: stacked});
			};
			Object.defineProperty(console[name], "name", {value: name});
			fakeNative(self.console[name]);
		};
	};
	// Promise tracking
	RawApi.promise = Promise;
	let promIter = function (type, name, arr) {
		let result = new Promise(RawApi.promise[type](arr));
		let msg = {e: `prom${name}`, id: result[UID], data: []};
		arr?.forEach(function (e) {
			if (e?.constructor == Promise) {
				msg.data.push(`Promise#${e[UID]}`);
			} else {
				msg.data.push(smartClone(e));
			};
		});
		extChannel.postMessage(msg);
		return result;
	};
	self.Promise = class Promise {
		#realPromise;
		constructor(executor) {
			let upThis = this;
			this[UID] = getRandom(uniqueLen);
			if (executor.constructor == RawApi.promise) {
				//extChannel.postMessage({e: "asyncChain", id: this[UID]});
				this.#realPromise = executor;
			} else if (executor.constructor == Promise) {
				ics.error(`Recursive promise capsulation.`);
			} else {
				if (!executor[UID]) {
					executor[UID] = getRandom(uniqueLen);
				};
				extChannel.postMessage({e: "asyncNew", id: this[UID], func: executor[UID]});
				this.#realPromise = new RawApi.promise(function (resolve, reject) {
					extChannel.postMessage({e: "asyncRun", id: upThis[UID]});
					let resolver = function (value) {
						extChannel.postMessage({e: "asyncDone", id: upThis[UID], data: smartClone(value), func: executor[UID], parent: upThis[PUID]});
						resolve(value);
					};
					let rejector = function (reason) {
						extChannel.postMessage({e: "asyncFail", id: upThis[UID], data: reason, func: executor[UID], parent: upThis[PUID]});
						reject(reason);
					};
					if (executor) {
						executor(resolver, rejector);
					};
				});
			};
			this.#realPromise[UID] = this[UID];
		};
		then(success, failure = function (reason) {
			throw(reason);
		}) {
			let upThis = this;
			if (!success[UID]) {
				success[UID] = getRandom(uniqueLen);
			};
			if (!failure[UID]) {
				failure[UID] = getRandom(uniqueLen);
			};
			let result = new Promise(this.#realPromise.then(function (value) {
				extChannel.postMessage({e: "asyncDone", id: result[UID], data: smartClone(value), func: success[UID], parent: upThis[UID]});
				return success(value);
			}, function (reason) {
				extChannel.postMessage({e: "asyncFail", id: result[UID], data: reason, func: failure[UID], parent: upThis[UID]});
				return failure(reason);
			}));
			extChannel.postMessage({e: "asyncThen", id: result[UID], done: success[UID], fail: failure[UID], parent: this[UID]});
			result[PUID] = this[UID];
			return result;
		};
		catch(failure) {
			let upThis = this;
			if (!failure[UID]) {
				failure[UID] = getRandom(uniqueLen);
			};
			let result = new Promise(this.#realPromise.catch(function (reason) {
				extChannel.postMessage({e: "asyncFail", id: result[UID], data: reason, func: failure[UID], parent: upThis[UID]});
				return failure(reason);
			}));
			extChannel.postMessage({e: "asyncCatch", id: result[UID], func: failure[UID], parent: this[UID]});
			result[PUID] = this[UID];
			return result;
		};
		finally(final) {
			let upThis = this;
			if (!final[UID]) {
				final[UID] = getRandom(uniqueLen);
			};
			let result = new Promise(this.#realPromise.finally(function () {
				extChannel.postMessage({e: "asyncFinish", id: result[UID], func: final[UID], parent: upThis[UID]});
				return final();
			}));
			extChannel.postMessage({e: "asyncFinal", id: result[UID], func: final[UID], parent: this[UID]});
			result[PUID] = this[UID];
			return result;
		};
		static all(arr) {
			return promIter("all", "All", arr);
		};
		static allSettled(arr) {
			return promIter("allSettled", "Settle", arr);
		};
		static any(arr) {
			return promIter("any", "Any", arr);
		};
		static race(arr) {
			return promIter("race", "Race", arr);
		};
		static reject(value) {
			let result = new Promise(RawApi.promise.reject(value));
			let msg = {e: "promReject", id: result[UID]};
			if (value?.constructor == RawApi.promise) {
				msg.data = `Promise#${value[UID]}`;
			} else {
				msg.data = smartClone(value);
			};
			extChannel.postMessage(msg);
			return result;
		};
		static resolve(value) {
			let result = new Promise(RawApi.promise.resolve(value));
			let msg = {e: "promResolve", id: result[UID]};
			if (value?.constructor == RawApi.promise) {
				msg.data = `Promise#${value[UID]}`;
			} else {
				msg.data = smartClone(value);
			};
			extChannel.postMessage(msg);
			return result;
		};
	};
	Object.defineProperty(self.Promise, "name", {value: "Promise"});
	fakeNative(self.Promise);
	// Page error capturing
	self.addEventListener("error", function (event) {
		extChannel.postMessage({e: "pageErr", type: event.type, promise: false, log: errorFilter(event.message), from: event.filename});
	});
	self.addEventListener("unhandledrejection", function (event) {
		extChannel.postMessage({e: "pageErr", type: "promise", promise: event.promise[UID], log: errorFilter(event.reason) || event.reason, from: event.promise[UID]});
	});
	// Event listener hijack
	RawApi.addEL = HTMLElement.prototype.addEventListener;
	let addEventListener = function (type, listener, options = false) {
		// This should return nothing
		let upThis = this, impl = "func";
		if (!this[UID]) {
			// Adds a UID if it does not exist
			this[UID] = getRandom(uniqueLen);
		};
		if (listener?.handleEvent) {
			impl = "obj";
			// Implements the handleEvent handler
			listener.handleEvent[UID] = listener.handleEvent[UID] || getRandom(uniqueLen);
		} else {
			// Normal callback
			listener[UID] = listener[UID] || getRandom(uniqueLen);
		};
		extChannel.postMessage({e: "evAdd", type: type, impl: impl, func: listener[UID] || listener.handleEvent[UID], actor: this[UID], selector: getCSSSelector(this), blocked: "none"});
		// Currently just monitors addition for handleEvent
		if (impl == "func") {
			RawApi.addEL.call(this, type, function (ev) {
				let msg = {e: "evAct", type: type, func: listener[UID], actor: ev.currentTarget[UID], from: ev.target[UID], selector: getCSSSelector(ev.currentTarget), blocked: "full"};
				if (blacklistEvent.indexOf(ev.type) == -1) {
					msg.blocked = "none";
					extChannel.postMessage(msg);
					//listener.call(upThis, ev);
					listener.call(ev.currentTarget, ev);
				} else {
					extChannel.postMessage(msg);
				};
			}, options);
		} else {
			RawApi.addEL.call(this, type, listener, options);
		};
	};
	fakeNative(addEventListener);
	HTMLElement.prototype.addEventListener = addEventListener;
	document.addEventListener = addEventListener;
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
	RawApi.history = self.history;
	{
		let replaceState = function (stateObj, unused, url = "") {
			let msg = {e: "historySet", data: stateObj, target: url, blocked: "full"};
			if (MinConf.h.r == 2) {
				RawApi.history.replaceState(stateObj, unused, url);
				msg.blocked = "none";
			} else if (MinConf.h.r == 1) {
				RawApi.history.replaceState(stateObj, unused, "");
				msg.blocked = "partial";
			};
			extChannel.postMessage(msg);
		};
		let pushState = function (stateObj, unused, url = "") {
			let msg = {e: "historyAdd", data: stateObj, target: url, blocked: "full"};
			if (MinConf.h.p == 2) {
				RawApi.history.pushState(stateObj, unused, url);
				msg.blocked = "none";
			} else if (MinConf.h.p == 1) {
				RawApi.history.pushState(stateObj, unused, "");
				msg.blocked = "partial";
			};
			extChannel.postMessage(msg);
		};
		let go = function (delta = 0) {
			let msg = {e: "historyGo", data: delta, suppressed: true};
			if (MinConf.h.g) {
				RawApi.history.go(delta);
				msg.suppressed = false;
			};
			extChannel.postMessage(msg);
		};
		let back = function (delta = 0) {
			let msg = {e: "historyGo", data: -1, suppressed: true};
			if (MinConf.h.b) {
				RawApi.history.back();
				msg.suppressed = false;
			};
			extChannel.postMessage(msg);
		};
		let forward = function (delta = 0) {
			let msg = {e: "historyGo", data: 1, suppressed: true};
			if (MinConf.h.f) {
				RawApi.history.forward();
				msg.suppressed = false;
			};
			extChannel.postMessage(msg);
		};
		fakeNative(replaceState);
		Object.defineProperty(self, "history", {value: new Proxy(self.history, {set: function (obj, prop, value) {
			if (prop == "scrollRestoration") {
				let msg = {e: "historySR", data: value};
				obj[prop] = value;
				return value;
			} else {
				return obj[prop];
			};
		}, get: function (obj, prop) {
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