"use strict";

let ICS = function () {
	const levels = ["error", "warn", "info", "debug"];
	let upThis = this;
	this.level = levels.indexOf("info");
	levels.forEach(function (e, i) {
		upThis[e] = function () {
			if (upThis.level >= i) {
				console[e](...arguments);
			};
		};
	});
};
let ics = new ICS();

export {ics};