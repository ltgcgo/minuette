"use strict";
import {ics} from "./ics.js";
import {fakeNative} from "./minuette/fakeNative.js";
import {getCSSSelector} from "./minuette/cssSelector.js"
import {getRandom} from "./minuette/getRandom.js";
import {getEventFamily, getEventData} from "./minuette/eventData.js"
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
	HTMLElement.prototype.addEventListener = function addEventListener (type, listener, options) {
		let upThis = this;
		listener[UID] = listener[UID] || getRandom(uniqueLen);
		this[UID] = this[UID] || getRandom(uniqueLen);
		extChannel.postMessage({e: "evAdd", type: type, func: listener[UID], element: this[UID], selector: getCSSSelector(this)});
		let result = addEL.apply(this, [type, function (event) {
			let msgObj = {e: "evTrig", type: event.type, func: listener[UID], element: this[UID], selector: getCSSSelector(this)};
			msgObj.origin = event.target[UID];
			if (true) {
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
};
ics.debug("Minuette launched.");