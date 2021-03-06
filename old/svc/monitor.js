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
		if (!tabPage[data.id]) {
			tabPage[data.id] = new Set();
		};
			browser.tabs.executeScript(data.id, {code: injectorAgentText.replace("-ReplaceThisWithTabId-", data.id), allFrames: true, runAt: "document_start"});
			console.info("Injection agent is now live on tab \"" + data.id + "\": " + data.url + ".");
	};
};
let loadListener = async function (data) {
	tabListener(await browser.tabs.get(data.tabId));
};
let pageCloseListener = async function (pid) {
	if (tracking[pid]) {
		tabPage[tracking[pid].tab].delete(pid);
		tracking[pid].port.disconnect();
		delete tracking[pid];
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
	connection.onMessage.addListener(function (data) {
		let msg = JSON.parse(data);
		switch (msg.event) {
			case "pageStart":
			case "pageKeep": {
				tabPage[msg.tid].add(msg.pid);
				if (!tracking[msg.pid]) {
					tracking[msg.pid] = {port: connection, elements: {}, url: msg.url, tab: msg.tid};
				};
				tracking[msg.pid].ts = Date.now();
				break;
			};
			case "pageEnd": {
				pageCloseListener(msg.pid);
				break;
			};
			case "elAdd": {
				if (!tracking[msg.pid].elements[msg.eid]) {
					tracking[msg.pid].elements[msg.eid] = new Set();
					tracking[msg.pid].elements[msg.eid].selector = msg.selector;
				};
				tracking[msg.pid].elements[msg.eid].add(msg.type);
				break;
			};
			default: {
				console.info("Private event: %o", msg);
			};
		};
	});
};
let tabCloseListener = async function (data) {
	//console.info(data);
	/* if (tabPage[data.id]) {
		delete tabPage[data.id];
	}; */
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
	for (let pid in tracking) {
		tracking[pid].port.postMessage('{event:"monitorDisconnect"}');
	};
});
postMessage('{event:"monitorConnect"}');

// Fetch the agent scripts periodicly
let fetcher = async function () {
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
}, task = setInterval(fetcher, 2500);
fetcher();

// Keep-alive check
let keepalive = setInterval(function () {
	let ts = Date.now();
	for (let pid in tracking) {
		switch (true) {
			case ((ts - tracking[pid].ts) < 5000): {
				break;
			};
			default: {
				tracking[pid].port.disconnect();
				delete tracking[pid];
				console.info("Removed dead tab " + pid);
				break;
			};
		};
	};
}, 5000);
