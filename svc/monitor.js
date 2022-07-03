"use strict";
import {ics} from "../svc/ics.js";
self.ics = ics;

// Preparation
const internalProtocols = ["about:", "chrome:", "edge:", "moz-extension:", "chrome-extension:"];
const randomMap = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
self.injector = {}, self.listeners = {}, self.inTabs = {}, self.inPages = {};

// URL filtering
let notInternal = function (urlT) {
	let url = new URL(urlT);
	if (internalProtocols.indexOf(url.protocol) > -1) {
		return false;
	};
	return true;
};

// Page message processor
listeners.pageMsg = async function (conn) {
	conn.postMessage(injector.payload);
	conn.onMessage.addListener(async function (data) {
		let msg = JSON.parse(data);
		switch (msg.e) {
			case "pageBegin":
			case "pageKeep": {
				inTabs[msg.t] = msg.p;
				if (!inPages[msg.p]) {
					inPages[msg.p] = {port: conn, elements: {}, tab: msg.t};
					inPages[msg.p].port.pid = msg.p;
					inPages[msg.p].url = new URL(msg.u);
					inPages[msg.p].ts = Date.now();
				};
				break;
			};
			case "pageEnd": {
				break;
			};
		};
	});
};

// Tab load
browser.webNavigation.onCommitted.addListener(async function (data) {
	if (notInternal(data.url)) {
		//ics.debug(`Tab opened: %o`, data);
		inTabs[data.id] = new Set();
		listeners.tabOpen(await browser.tabs.get(data.tabId));
	} else {
		//ics.debug(`Ignore opened internal tab: %o`, data);
	};
});
listeners.tabOpen = async function (data) {
	browser.tabs.executeScript(data.id, {code: injector.agent.replace("-ReplaceThisWithTabId-", data.id), allFrames: true, runAt: "document_start"});
	ics.debug(`Injection active on tab ${data.id}(${data.url}).`);
};

// Tab unload
listeners.pageClose = async function (data) {};
listeners.tabClose = async function (data) {};
browser.webNavigation.onBeforeNavigate.addListener(async function (data) {
	if (notInternal(data.url)) {
		//ics.debug(`Tab closed: %o`, data);
		listeners.tabClose(await browser.tabs.get(data.tabId));
	} else {
		//ics.debug(`Ignore closed internal tab: %o`, data);
	};
});

// Fetch the agent scripts periodicly
injector.func = async function () {
	fetch("/svc/agent.js").then(function (response) {
		return response.text();
	}).then(function (data) {
		injector.agent = data;
	});
	fetch("/svc/minuette.js").then(function (response) {
		return response.text();
	}).then(function (data) {
		injector.payload = data;
	});
};
injector.id = setInterval(injector.func, 2500);
injector.func();

// Heartbeat check
let heartbeat = setInterval(async function () {
	let ts = Date.now();
	for (let pid in inPages) {
		if (ts - inPages[pid].ts > 15000) {
			inPages[pid].port.disconnect();
			let tid = inPages.tab;
			if (inTabs[tid] && inTabs[tid].has(pid)) {
				inTabs[tid].delete(pid);
			};
			if (inTabs[tid].size < 1) {
				delete inTabs[tid];
				ics.debug(`Dead tab ${tid} removed.`);
			};
			delete inPages[pid];
			ics.debug(`Dead page ${pid} removed.`);
		};
	};
}, 10000);