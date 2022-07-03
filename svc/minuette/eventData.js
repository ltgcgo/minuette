"use strict";
let getEventFamily = function (type) {
	switch (type.toLowerCase()) {
		case "animationcancel":
		case "animationend":
		case "animationiteration":
		case "animationstart": {
			return "animate";
			break;
		};
		case "beforeunload":
		case "unload": {
			return "unload";
			break;
		};
		case "blur":
		case "focus": {
			return "focus";
			break;
		};
		case "compositionend":
		case "compositionstart": {
			return "compose";
			break;
		};
		case "copy":
		case "cut":
		case "paste": {
			return "clipboard";
			break;
		};
		case "drag":
		case "dragend":
		case "dragenter":
		case "dragleave":
		case "dragover":
		case "dragstart":
		case "drop": {
			return "drag";
			break;
		};
		case "formdata":
		case "reset":
		case "submit": {
			return "form";
			break;
		};
		case "fullscreenchange":
		case "fullscreenerror": {
			return "fullscreen";
			break;
		};
		case "input":
		case "invalid":
		case "search":
		case "selectionchange": {
			return "input";
			break;
		};
		case "keydown":
		case "keypress":
		case "keyup": {
			return "key";
			break;
		};
		case "load":
		case "loadeddata":
		case "loadedmetadata":
		case "loadend":
		case "loadstart": {
			return "load";
			break;
		};
		case "message": {
			return "message";
			break;
		};
		case "transitioncancel":
		case "transitionend":
		case "transitionrun":
		case "transitionstart": {
			return "transition";
			break;
		};
		case "visibilitychange": {
			return "visibility";
			break;
		};
		case "wheel": {
			return "wheel";
			break;
		};
		default: {
			return "unknown";
		};
	};
};
let getEventData;
export {
	getEventFamily,
	getEventData
};