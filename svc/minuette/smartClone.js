"use strict";

import {getCSSSelector} from "./cssSelector.js";

const propBlacklist = [];
const recursiveLevel = 8;

let canClone = function (value, step = 0) {
	let newStep = step + 1;
	// Adapted from StackOverflow question 32673518
	if (Object(value) !== value) {
		// Value is primitive
		return true;
	} else if (newStep > recursiveLevel) {
		return true;
	};
	try {
		value?.constructor;
	} catch (err) {
		//console.error(err.stack);
		return false;
	};
	switch (value?.constructor) {
		//case Error:
		//case AggregateError:
		//case EvalError:
		//case InternalError:
		//case RangeError:
		//case ReferenceError:
		//case SyntaxError:
		//case TypeError:
		//case URIError:
		//case ArrayBuffer:
		//case Blob:
		case Boolean:
		case Date:
		//case FileList:
		//case ImageBitmap:
		//case ImageData:
		case Number:
		case RegExp:
		case String: {
			return true;
			break;
		};
		case Array:
		case Object: {
			return Object.keys(value).every(prop => canClone(value[prop], newStep));
			break;
		};
		case Map: {
			return [...value.keys()].every(canClone, newStep) && [...value.values()].every(canClone, newStep);
			break;
		};
		case Set: {
			return [...value.keys()].every(canClone, newStep);
			break;
		};
		default: {
			return false;
		};
	};
};
let selectiveBlock = function (value) {
	let prompt = value;
	if (prompt === null || prompt === undefined) {
	} else if (prompt.constructor == self[prompt.constructor.name]) {
		// Can be used to filter by only names!
		let protoName = prompt.constructor.name;
		if (protoName.indexOf("HTML") == 0 && protoName.indexOf("Element") == protoName.length - 7) {
			prompt = {
				uncloned: "htmlElement",
				selector: getCSSSelector(prompt)
			};
		} else if (
			prompt.tagName?.length > 0 &&
			prompt.childNodes?.constructor == NodeList &&
			prompt.classList?.constructor == DOMTokenList &&
			prompt.id?.constructor == String &&
			prompt.innerHTML?.constructor == String
		) {
			prompt = {
				uncloned: "customElement",
				selector: getCSSSelector(prompt)
			};
		};
	};
	return prompt;
};
let smartClone = function (value, step = 0) {
	let newStep = step + 1;
	if (canClone(value)) {
		return value;
	} else {
		try {
			value?.constructor;
		} catch (err) {
			//console.error(err.stack);
			//return smartClone(err, newStep);
		};
		switch (value?.constructor) {
			case ArrayBuffer: {
				return {
					uncloned: "arrayBuffer",
					length: value.byteLength
				};
			};
			case Location:
			case URL: {
				return {
					uncloned: "url",
					href: value.href
				};
			};
			case Function: {
				return {
					uncloned: "function",
					name: value.name
				};
			};
			case Headers: {
				return Object.fromEntries(Array.from(value));
			};
			case ReadableStream: {
				return {
					uncloned: "stream",
					type: "r"
				};
			};
			case WritableStream: {
				return {
					uncloned: "stream",
					type: "w"
				};
			};
			// This can vary, and may become not available.
			case Window: {
				return {
					uncloned: "globalThis",
					name: "window"
				};
			};
			case HTMLDocument: {
				return {
					uncloned: "globalThis",
					name: "document"
				};
			};
			case XMLHttpRequest: {
				let re = {
					readyState: value.readyState,
					type: value.responseType || "text",
					url: value.responseURL,
					status: value.status,
					statusText: value.statusText,
					timeout: value.timeout,
					withCred: value.withCredentials
				};
				switch (re.type) {
					case "arraybuffer":
					case "blob":
					case "json":
					case "text": {
						re.data = smartClone(value.response);
						break;
					};
					case "document": {
						re.data = {uncloned: "document"};
						break;
					};
					default: {
						re.data = {uncloned: re.type};
					};
				};
				return re;
			};
			case Error:
			case AggregateError:
			case EvalError:
			case InternalError:
			case RangeError:
			case ReferenceError:
			case SyntaxError:
			case TypeError:
			case URIError: {
				return value.stack;
				break;
			};
			case Array: {
				if (step < 8) {
					let newArr = [];
					value?.forEach(function (e, i) {
						let prompt = selectiveBlock(e);
						newArr[i] = smartClone(prompt, newStep);
					});
					return newArr;
				} else {
					return {
						uncloned: value?.constructor.name
					};
				};
				break;
			};
			default: {
				if (step < 8) {
					let newObj = {};
					for (let prop in value) {
						let prompt = selectiveBlock(value[prop]);
						newObj[prop] = smartClone(prompt, newStep);
					};
					return newObj;
				} else {
					return {
						uncloned: value?.constructor.name
					};
				};
			};
		};
	};
};

export {
	canClone,
	smartClone
};
