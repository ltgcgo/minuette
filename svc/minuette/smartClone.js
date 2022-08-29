"use strict";

let canClone = function (value) {
	// Adapted from StackOverflow question 32673518
	if (Object(value) !== value) {
		// Value is primitive
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
		case ArrayBuffer:
		case Blob:
		case Boolean:
		case Date:
		case FileList:
		case ImageBitmap:
		case ImageData:
		case Number:
		case RegExp:
		case String: {
			return true;
			break;
		};
		case Array:
		case Object: {
			return Object.keys(value).every(prop => canClone(value[prop]));
			break;
		};
		case Map: {
			return [...value.keys()].every(canClone) && [...value.values()].every(canClone);
			break;
		};
		case Set: {
			return [...value.keys()].every(canClone);
			break;
		};
		default: {
			return false;
		};
	};
};
let smartClone = function (value) {
	if (canClone(value)) {
		return value;
	} else {
		switch (value?.constructor) {
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
			default: {
				return {
					unclonedName: value?.constructor.name
				};
			};
		};
	};
};

export {
	canClone,
	smartClone
};