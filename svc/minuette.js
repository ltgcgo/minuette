"use strict";
import {ics} from "./ics";
{
	// Constants
	const selectorSkip = ["id", "class"],
	EL = Symbol(), // Event listeners
	ELs = {}, // Tracking overall event listeners
	TSt = Symbol(), // The real toString
	UID = Symbol(); // Unique ID for tracked objects
	const fakeNativeCode = Function.toString().replace("function Function(", "function FuncName(");
	// Namespace for Minuette
	let Minuet = {};
	// Allow hiding real code
	let noToStr = function () {
		return fakeNativeCode.replace("FuncName", this.name);
	};
	let hideCode = function (func) {
		if (!func[TSt]) {
			func[TSt] = func.toString;
			func.toString = noToStr;
		};
	};
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
	// Original API exposure
	Minuet.console = console;
	// Console hijack
	{
		self.console = {};
		for (let name in Minuet.console) {
			self.console[name] = function () {
				extChannel.postMessage({e: "console", level: name});
				Minuet.console[name](...arguments);
			};
		};
	};
};
ics.debug("Minuette launched.");