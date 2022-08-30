"use strict";

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
let smartClone = function (value, step = 0) {
	let newStep = step + 1;
	if (canClone(value)) {
		return value;
	} else {
		switch (value?.constructor) {
			case ArrayBuffer: {
				return {
					uncloned: "ArrayBuffer",
					length: value.byteLength
				};
			};
			case Function: {
				return {
					uncloned: "function",
					name: value.name
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
				if (step < recursiveLevel) {
					let newArr = [];
					value?.forEach(function (e, i) {
						let prompt = e;
						if (prompt === null || prompt === undefined) {
						};
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
						let prompt = value[prop];
						if (prompt === null || prompt === undefined) {
						};
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