"use strict";

// Banning console override
self.altConsole = self.console;
Object.freeze(altConsole);

// Listener intercepter
{
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
	
	self.EventListeners = Symbol("Event Listeners");
	let ELs = self.EventListeners;
	self.EventListener = {};
	let EL = new Proxy(EventListener, {});
	if (!EL.list) {
		EL.list = {};
	};
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
	let capturer = function (invEvent) {
		if (self.debugMode || this.debugMode) {
			let eventFilter = self.eventFilter || this.eventFilter;
			if (!eventFilter || (eventFilter && eventFilter.indexOf(invEvent.type) != -1)) {
				console.info({e: this, t: invEvent.type});
			};
			debugger;
		};
	};
	let addEL = HTMLElement.prototype.addEventListener;
	HTMLElement.prototype.addEventListener = function (type, listener, options) {
		let result = addEL.apply(this, arguments);
		if (!this[ELs]) {
			this[ELs] = {};
		};
		if (!this[ELs][type]) {
			this[ELs][type] = new LSet();
			addEL.apply(this, [type, capturer]);
			altConsole.info("Registered type " + type + " on %o", type, this);
		};
		let listenerCapture = {f: listener, o: options};
		this[ELs][type].add(listenerCapture);
		if (!EL.list[type]) {
			EL.list[type] = new Set();
		};
		EL.list[type].add(this);
		altConsole.info("Added: %o", {b: listenerCapture, a: type, c: this});
		return result;
	};
	let rmvEL = HTMLElement.prototype.removeEventListener;
	HTMLElement.prototype.removeEventListener = function (type, listener, options) {
		let result = rmvEL.apply(this, arguments);
		let listenerCapture = {f: listener, o: options};
		altConsole.info("Removed: %o", {b: listenerCapture, a: type, c: this});
		if (!this[ELs]) {
			this[ELs] = {};
			altConsole.warn("No event listeners present.");
		};
		if (!this[ELs][type]) {
			this[ELs][type] = new LSet();
			altConsole.warn("No event listeners of type \"" + type + "\" present.");
		};
		let setFind = this[ELs][type].find();
		if (setFind) {
			this[ELs][type].delete(setFind);
			if (this[ELs][type].size == 0) {
				delete this[ELs][type];
				rmvEL.apply(this, [type, capturer]);
				altConsole.info("Removed type " + type + " on %o", this);
			};
		} else {
			altConsole.warn("Tried to remove a non-existent listener.");
		};
		return result;
	};
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
