"use strict";
import {ics} from "../svc/ics.js";
self.ics = ics;

// Preparation
const internalProtocols = ["about:", "chrome:", "edge:", "moz-extension:", "chrome-extension:"];
const randomMap = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
self.injector = {}, self.listeners = {};

// URL filtering
let notInternal = function (urlT) {
	let url = new URL(urlT);
	if (internalProtocols.indexOf(url.protocol) > -1) {
		return false;
	};
	return true;
};

// Tab load
browser.webNavigation.onCommitted.addListener(async function (data) {
	if (notInternal(data.url)) {
		//ics.debug(`Tab opened: %o`, data);
		listeners.tabOpen(browser.tabs.get(data.tabId));
	} else {
		ics.debug(`Ignore opened internal tab: %o`, data);
	};
});
listeners.tabOpen = async function (data) {};

// Tab unload
browser.webNavigation.onBeforeNavigate.addListener(async function (data) {
	if (notInternal(data.url)) {
		//ics.debug(`Tab closed: %o`, data);
		listeners.tabClose(browser.tabs.get(data.tabId));
	} else {
		ics.debug(`Ignore closed internal tab: %o`, data);
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