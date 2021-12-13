"use strict";

let injectorAgentText, injectorText, tracking = {}, tabPage = {};
const internalProtocols = ["about", "chrome", "edge"];

// Preparation
const randomMap = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
Function.prototype.repeat = function (count = 1) {
	let iteration = 0;
	while (iteration < count) {
		this();
		iteration ++;
	};
};
Math.useRandom = function (size, start = 0, intOnly) {
	let rand = 0;
	// Get a random floating point number between 0 and 1
	if (self.crypto) {
		let int32 = new Uint32Array(1);
		crypto.getRandomValues(int32);
		rand = int32 / 4294967296;
	} else {
		rand = Math.random();
	};
	// Size it however you want
	if (+size > 0) {
		rand *= size;
	};
	if (start.constructor == Number) {
		rand += start;
	};
	if (intOnly) {
		rand = Math.floor(rand);
	};
	return rand;
};
String.prototype.random = function (length) {
	let result = "", upThis = this;
	(function () {
		result += upThis[Math.useRandom(upThis.length, 0, true)];
	}).repeat(length);
	return result;
};
let getUid = function (length, map = randomMap) {
	return map.random(length);
};

// Listen to the events
let tabListener = async function (data) {	
	console.info(data);
	if (internalProtocols.indexOf(data.url.slice(0, data.url.indexOf(":"))) != -1 && data.url != "about:blank") {
		console.debug("Skipped interception on browser's internal pages.");
	} else if (data.id < 0) {
		console.debug("Skipped interception on reserved pages.");
	} else {
		let pageId = getUid(24);
		if (!tabPage[data.id]) {
			browser.tabs.executeScript(data.id, {code: injectorAgentText.replace("-ReplaceThisWithTabId-", data.id), allFrames: true, runAt: "document_start"});
			console.info("Injection agent is now live on tab \"" + data.id + "\"(" + pageId + "): " + data.url + ".");
			tabPage[data.id] = new Set();
		};
	};
};
let loadListener = async function (data) {
	tabListener(await browser.tabs.get(data.tabId));
};
let pageCloseListener = async function (cid) {
	if (tracking[pid]) {
		tracking[pid].port.disconnect();
		delete tracking[pid];
	};
};
let messageInterpreter = function (data) {
	let msg = JSON.parse(data);
	switch (msg.event) {
		case "pageConnect": {
			console.warn(data);
			break;
		};
		case "pageClose": {
			pageCloseListener(msg.cid);
			break;
		};
		case "elAdd": {
			if (!tracking[msg.cid].elements[msg.eid]) {
				tracking[msg.cid].elements[msg.eid] = new Set();
				tracking[msg.cid].elements[msg.eid].selector = msg.selector;
			};
			tracking[msg.cid].elements[msg.eid].add(msg.type);
			break;
		};
		default: {
			console.info("Private event: %o", msg);
		};
	};
};
let publicInterpreter = function (data) {
	let msg = JSON.parse(data);
	switch (msg.event) {
		default: {
			console.info("Public event: %o", msg);
		};
	};
};
let messageConnectionListener = async function (connection) {
	connection.postMessage(injectorText);
	connection.onMessage.addListener(messageInterpreter)
};
let tabCloseListener = async function (data) {
	console.info(data);
	if (tabPage[data.id]) {
		delete tabPage[data.id];
	};
	console.info("Tab \"" + data.id + "\" is leaving \"" + data.url + "\" for \"" + data.pendingUrl + "\".");
};
let unloadListener = async function (data) {
	tabCloseListener(await browser.tabs.get(data.tabId));
};

browser.webNavigation.onCommitted.addListener(loadListener);
browser.webNavigation.onBeforeNavigate.addListener(unloadListener);
browser.runtime.onMessage.addListener(messageConnectionListener);
browser.runtime.onConnect.addListener(messageConnectionListener);

// Announce load and unload times
addEventListener("beforeunload", function () {
	browser.runtime.sendMessage('{event:"monitorDisconnect"}');
});
postMessage('{event:"monitorConnect"}');

// Fetch the agent scripts periodicly
let task = setInterval(function () {
	fetch("/svc/agent.js").then(function (response) {
		return response.text();
	}).then(function (data) {
		injectorAgentText = data;
	});
	fetch("/svc/minuette.js").then(function (response) {
		return response.text();
	}).then(function (data) {
		injectorText = data;
	});
}, 2500);

// Keep-alive check
let keepalive = setInterval(function () {
}, 5000);
