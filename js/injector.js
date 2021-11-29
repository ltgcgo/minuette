"use strict";

// Banning console override
self.altConsole = self.console;
Object.freeze(altConsole);

// Listener intercepter
{
	// Exchange information between extensions and pages.
	let channelId = "-ReplaceMeWithSomethingUnique-";
	let broadcaster = new BroadcastChannel(channelId);
	altConsole.info("Cross-context listening on page side: " + channelId);
	broadcaster.onmessage = function (msg) {
		let data = msg.data;
	};
	
	// Customized sets
	let LSet = class extends Set {
		constructor() {
			super(...arguments);
		};
		find(listener, option) {
			let result = undefined;
			this.forEach(function (e) {
				if (result == undefined) {
					if (e.f == listener && e.o == option) {
						result = e;
					};
				};
			});
			return result;
		};
	};
	
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
	
	// Get element's selector
	let selectorSkip = ["id", "class"];
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
	
	// Event listener's interception
	self.EventListeners = Symbol("Event Listeners");
	let ELs = self.EventListeners;
	self.EventListener = {};
	let EL = new Proxy(EventListener, {});
	if (!EL.list) {
		EL.list = {};
	};
	let EID = Symbol("Element ID");
	
	// Remove all events of a specific type
	EL.removeEvent = function (type) {
		if (EL.list[type]) {
			let affected = new Set();
			EL.list[type].forEach(function (e) {
				e.removeEvent(type);
			});
			affected.forEach(function (e) {
				delete e[ELs][type];
			});
			altConsole.info("Removed type with " + EL.list[type].size + " listeners: " + type + ".");
			delete EL.list[type];
			debugger;
		} else {
			altConsole.warn("Tried to remove a non-existent type: " + type + ".");
		};
	};
	// Smart event capturing
	let capturer = function (invEvent) {
		let eventFilter = self.eventFilter || this.eventFilter;
		if (self.debugMode || this.debugMode) {
			if (!eventFilter || (eventFilter && eventFilter.indexOf(invEvent.type) != -1)) {
				console.info({e: this, t: invEvent.type});
			};
		};
		if (!eventFilter || (eventFilter && eventFilter.indexOf(invEvent.type) != -1)) {
			broadcaster.postMessage({event: "elTrig", type: invEvent.type, eid: this[EID], selector: this.getSelector()});
		};
	};
	// Intercepting addEventListener
	let addEL = HTMLElement.prototype.addEventListener;
	HTMLElement.prototype.addEventListener = function (type, listener, options) {
		let result = addEL.apply(this, arguments);
		if (!this[ELs]) {
			this[ELs] = {};
		};
		if (!this[EID]) {
			this[EID] = getCuid();
		};
		if (!this[ELs][type]) {
			this[ELs][type] = new LSet();
			addEL.apply(this, [type, capturer]);
			broadcaster.postMessage({event: "elAdd", type: type, eid: this[EID], selector: this.getSelector()});
			//altConsole.info("Registered type " + type + " on %o", type, this);
		};
		let listenerCapture = {f: listener, o: options};
		this[ELs][type].add(listenerCapture);
		if (!EL.list[type]) {
			EL.list[type] = new Set();
		};
		EL.list[type].add(this);
		//console.info(this[EID]);
		//altConsole.info("Added: %o", {b: listenerCapture, a: type, c: this});
		return result;
	};
	// Intercepting removeEventListener
	let rmvEL = HTMLElement.prototype.removeEventListener;
	HTMLElement.prototype.removeEventListener = function (type, listener, options) {
		let result = rmvEL.apply(this, arguments);
		let listenerCapture = {f: listener, o: options};
		//altConsole.info("Removed: %o", {b: listenerCapture, a: type, c: this});
		if (!this[ELs]) {
			this[ELs] = {};
			altConsole.warn("No event listeners present.");
		};
		if (!this[ELs][type]) {
			this[ELs][type] = new LSet();
			altConsole.warn("No event listeners of type \"" + type + "\" present.");
		};
		if (!this[EID]) {
			this[EID] = getCuid();
		};
		let setFind = this[ELs][type].find();
		if (setFind) {
			this[ELs][type].delete(setFind);
			if (this[ELs][type].size == 0) {
				delete this[ELs][type];
				rmvEL.apply(this, [type, capturer]);
				broadcaster.postMessage({event: "elRmv", type: type, eid: this[EID], selector: this.getSelector()});
				//altConsole.info("Removed type " + type + " on %o", this);
			};
		} else {
			altConsole.warn("Tried to remove a non-existent listener.");
		};
		return result;
	};
	// Remove events of a specific type on an element
	HTMLElement.prototype.removeEvent = function () {
		let upThis = this;
		Array.from(arguments).forEach(function (e) {
			if (upThis[ELs][e]) {
				upThis[ELs][e].forEach(function (el) {
					rmvEL.apply(upThis, [e, el.f, el.o]);
				});
				delete upThis[ELs][e];
			} else {
				altConsole.warn("Tried to remove a non-existent type.");
			};
		});
	};
};
