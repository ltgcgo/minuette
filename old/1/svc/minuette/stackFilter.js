"use strict";

const blacklist = [
	"<",
	"exports.default",
	"defineIteratorMethods"
];

let stackFilter = function (loc) {
	if (loc.length > 0) {
		let sepAt = loc.indexOf("@");
		let funs = loc.slice(0, sepAt).split("/");
		let result = funs[0];
		if (funs.length > 1) {
			let c = 0;
			while (c < funs.length) {
				let d = c + 1;
				if ("0123456789<".indexOf(result[0]) > -1) {
					result = funs[d];
				} else if (blacklist.indexOf(result) > -1) {
					result = funs[d];
				};
				c ++;
			};
		} else if (result.length == 0) {
			result = "<unnamed>";
		};
		result += `@${loc.slice(sepAt + 1)}`;
		return result;
	};
};
let errorFilter = function (err) {
	if (err.name && err.message?.length >= 0 && err.stack?.length >= 0) {
		let msg = err.name, stack = [];
		if (err.message) {
			msg += `: ${err.message}`;
		};
		err.stack.split("\n").forEach(function (e) {
			if (e) {
				msg += `\n  ${stackFilter(e)}`;
			};
		});
	} else {
		return err;
	};
};

export {
	errorFilter,
	stackFilter
};
