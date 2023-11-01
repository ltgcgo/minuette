"use strict";

{
	// Preallocated constants
	const runApply = Function.apply,
	selectorSkip = ["id", "class"],
	ELs = Symbol("Event Listener"),
	EL = {list:{}},
	Uid = Symbol("Unique ID"),
	Prnt = Symbol("Parent"),
	Root = Symbol("Root");
	
	// Config
	let Minuette = {
		reqAniFrame: {block: false}
	},
	Schedules = {iv: {}, to: {}, af: {}};
	self.Minuette = new Proxy(Minuette, {});
	
	// Banning console override
	self.altConsole = self.console;
	Object.freeze(altConsole);
	
	// Exchange information between extensions and pages.
	let channelId = "-ReplaceMeWithSomethingUnique-";
	let broadcaster = new BroadcastChannel(channelId);
	altConsole.info("Cross-context listening on page side: " + channelId);
	broadcaster.onmessage = function (msg) {
		let data = msg.data;
	};
	
	// Get unique IDs
	let map = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
	let primitive = new Uint8Array(24);
	let getCuid = function () {
		let cuid = "";
		self.crypto.getRandomValues(primitive);
		primitive.forEach(function (e) {
			cuid += map[e % 64];
		});
		return cuid;
	};
	
	// Get the CSS selector of an element
	HTMLElement.prototype.getSelector = HTMLElement.prototype.getSelector || function (includeSmart) {
		let text = "";
		text += this.tagName.toLowerCase();
		if (this.id) {
			text += "#" + this.id;
		};
		if (this.className) {
			this.classList.forEach(function (e) {
				text += "." + e;
			});
		};
		if (includeSmart) {
			for (let count = 0; count < this.attributes.length; count ++) {
				let target = this.attributes[count];
				if (selectorSkip.indexOf(target.name) == -1) {
					text += "[" + target.name + "=" + target.value + "]";
				};
			};
		};
		return text;
	};
	
	// Intercepting requestAnimationFrame
	let reqAniFrame = self.requestAnimationFrame;
	self.requestAnimationFrame = function () {
		let result, lastRun, action = "observe";
		let targetFunction = arguments[0];
		if (targetFunction && targetFunction.constructor == Function) {
			targetFunction[Uid] = targetFunction[Uid] || getCuid();
		} else {
			throw(new TypeError("Expected a function"));
		};
		if (!Minuette.reqAniFrame.whitelist) {
			Function.apply(reqAniFrame, [targetFunction]);
			lastRun = Schedules.af[0];
			Schedules.af[0] = Date.now();
		};
		broadcaster.postMessage({event:"trigSchedule",type:"animate",id:0,fid:targetFunction[Uid],ts:Schedules.af[0],minDelay:-1,lastTs:lastRun});
		return result;
	};
};
