"use strict";
const fakeNativeCode = Function.toString().replace("function Function(", "function FuncName("),
TSt = Symbol(); // Original toString
let noToStr = function () {
	return fakeNativeCode.replace("FuncName", this.name);
};
let fakeNative = function (func) {
	if (!func[TSt]) {
		func[TSt] = func.toString;
		func.toString = noToStr;
	};
};
fakeNative.toString = fakeNative;
export {fakeNative};