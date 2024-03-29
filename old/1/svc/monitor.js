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
	if (urlT == "about:blank") {
		return true;
	};
	if (internalProtocols.indexOf(url.protocol) > -1) {
		return false;
	};
	return true;
};

// Page message processor
listeners.pageMsg = function (conn) {
	conn.postMessage(injector.payload);
	conn.postMessage(getGeoMsg());
	conn.onMessage.addListener(async function (data) {
		let msg = JSON.parse(data);
		switch (msg.e) {
			case "console": {
				switch (msg.level) {
					case "debug":
					case "error":
					case "info":
					case "log":
					case "warn": {
						console[msg.level](`${msg.t}(${msg.c})\n[${msg.from.join("\n ")}]:\n`, ...msg.log);
						break;
					};
					default: {
						console.debug(`Log level ${msg.level} from ${msg.t}(${msg.c}/${msg.p}):\n`, ...msg.log);
					};
				};
				break;
			};
			case "pageErr": {
				console.error(`${msg.t}(${msg.c}) ${msg.type} [${msg.from}]:\n${msg.log}`);
				break;
			};
			case "pageBegin":
			case "pageKeep": {
				if (!inTabs[msg.t]) {
					inTabs[msg.t] = new Set();
				};
				inTabs[msg.t].add(msg.p);
				if (!inPages[msg.p]) {
					conn.page = msg.p;
					inPages[msg.p] = {port: conn, elements: {}, tab: msg.t};
					//inPages[msg.p].port.page = msg.p;
					inPages[msg.p].url = new URL(msg.u);
				};
				inPages[msg.p].ts = Date.now();
				break;
			};
			case "pageEnd": {
				listeners.pageClose({id: conn.page});
				break;
			};
			case "evAdd": {
				break;
			};
			case "evAct": {
				break;
			};
			case "evDel": {
				break;
			};
			case "asyncNew":
			case "asyncRun":
			case "asyncThen":
			case "asyncCatch":
			case "asyncFinal":
			case "promReject":
			case "promResolve":
			case "promAll":
			case "promAny":
			case "promRace":
			case "promSettle": {
				break;
			};
			default: {
				console.debug(msg);
			};
		};
	});
};
browser.runtime.onConnect.addListener(listeners.pageMsg);
browser.runtime.onMessage.addListener(listeners.pageMsg);

// Tab load
browser.webNavigation.onCommitted.addListener(async function (data) {
	if (notInternal(data.url)) {
		//ics.debug(`Tab opened: %o`, data);
		inTabs[data.tabId] = new Set();
		listeners.tabOpen(await browser.tabs.get(data.tabId));
	} else {
		ics.info(`Ignore opened internal tab ${data.tabId}(${data.url}).`);
	};
});
listeners.tabOpen = async function (data) {
	browser.tabs.executeScript(data.id, {
		code: injector.agent.replace("-ReplaceThisWithTabId-", data.id),
		allFrames: true,
		runAt: "document_start",
		matchAboutBlank: true
	});
	ics.info(`Injection active on tab ${data.id}(${data.url}).`);
};

// Tab unload
listeners.pageClose = async function (data) {
	let pid = data.id;
	inPages[pid]?.port.disconnect();
	let tid = inPages[pid]?.tab;
	if (inTabs[tid]?.has(pid)) {
		inTabs[tid].delete(pid);
	};
	if (inTabs[tid]?.size < 1) {
		delete inTabs[tid];
		ics.info(`Dead tab ${tid} removed.`);
	};
	delete inPages[pid];
	ics.info(`Dead page ${pid} removed.`);
};
listeners.tabClose = async function (data) {
	/* inTabs[data.id].forEach(function (e, i, a) {
		inPages[e].port.disconnect();
		delete inPages[e];
		a.delete(e);
		ics.debug(`Closed page ${e} in tab ${data.id} removed.`);
	}); */
};
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
			listeners.pageClose({id: pid});
		};
	};
	for (let tid in inTabs) {
		if (inTabs[tid].size < 1) {
			delete inTabs[tid];
			ics.info(`Removed dead tab ${tid}.`);
		};
	};
}, 10000);

// Fake geolocation support, default to the Greenwich Observatory.
let fakeLat = 51.4769,
fakeLong = 0;
let getGeoMsg = function () {
	return `{"e":"setLocation","lat":${fakeLat},"long":${fakeLong}}`;
};
let getNetLoc = async function () {
	let geoApi = await (await fetch("https://api.ip.sb/geoip/")).json();
	fakeLat = Math.round((geoApi.latitude + Math.random() * 0.2 - 0.1) * 10000) / 10000;
	fakeLong = Math.round((geoApi.longitude + Math.random() * 0.2 - 0.1) * 10000) / 10000;
	ics.info(`Fake geo in ${geoApi.country_code}(${geoApi.country}) to: ${fakeLat}, ${fakeLong}`);
};
let pushNetLoc = async function () {
	let geoMsg = getGeoMsg();
	for (let tid in inPages) {
		try {
			inPages[tid].port.postMessage(geoMsg);
		} catch (err) {};
	};
};
let thrgNetLoc = setInterval(function () {
	if (Math.random() < 0.02) {
		getNetLoc();
	};
}, 5000);
getNetLoc();
let thrpNetLoc = setInterval(pushNetLoc, Math.floor(Math.random() * 15000 + 15000));
