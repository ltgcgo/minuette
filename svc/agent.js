"use strict";
import {ics} from "./ics.js";
const map = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

if (!self.agentActive) {
	// Injection start
	let tabId = "-ReplaceThisWithTabId-";
	let injectedAt = document.readyState;
	ics.debug(`Injected as tab ${tabId}, on ${injectedAt}.`);
	// Prepare for injection and communication
	let pageId = "", connectionId = "", primitive = new Uint8Array(16);
	self.crypto.getRandomValues(primitive);
	primitive.forEach(function (e) {
		connectionId += map[e % 64];
	});
	self.crypto.getRandomValues(primitive);
	primitive.forEach(function (e) {
		pageId += map[e % 64];
	});
	ics.debug("Exchanging information with extension channel: " + pageId);
	// Generic extension private message receiver
	let receiver = function (data) {
		if (data.slice(0, 13) == "\"use strict\";") {
			if (!self.minuetteOn) {
				ics.debug(`Injection payload received when ${document.readyState}.`);
				let loader = document.createElement("script");
				let injectData = data.replace("-ReplaceMeWithSomethingUnique-", connectionId);
				let blobUri = URL.createObjectURL(new Blob([injectData]));
				loader.src = blobUri;
				document.head.appendChild(loader);
				self.minuetteOn = document.readyState;
				loader.onload = function () {
					ics.info(`Minuette loaded when ${minuetteOn} as ${connectionId}.`);
				};
			};
		} else {
			ics.debug("Received command: " + data);
			let msg = JSON.parse(data);
			if (msg.a) {
				switch (msg.e) {
				};
			} else {
				bridgeConnection.postMessage(msg);
			};
		};
	};
	// Attempt to connect to the extension backend
	let connection, refreshConnection = function () {
		connection = chrome.runtime.connect();
		ics.debug(`Connection refreshed.`);
		connection.onMessage.addListener(receiver);
		connection.onDisconnect.addListener(refreshConnection);
	};
	refreshConnection();
	// Message exchange with the page
	let bridgeConnection = new BroadcastChannel(connectionId);
	bridgeConnection.onmessage = function (msg) {
		let data = msg.data;
		if (data.noExt) {
			ics.debug(data);
		} else {
			data.c = connectionId;
			data.p = pageId;
			data.t = tabId;
			connection.postMessage(JSON.stringify(data));
		};
	};
	ics.debug(`Cross-context listening running on extension side: ${connectionId}`);
	// Signal Minuette the launch of injection agent
	connection.postMessage(JSON.stringify({e: "pageBegin", p: pageId, u: location.href, t: tabId, readyState: injectedAt}));
	// Generic extension public message receiver
	let pubReceiver = function (data) {
		let msg = JSON.parse(data);
		switch (msg.e) {
			case "monitorDisconnect":
			case "monitorConnect":
			default: {
				ics.debug("Public event: %o", msg);
			};
		};
	};
	chrome.runtime.onMessage.addListener(pubReceiver);
	// Signal Minuette if the page closes
	addEventListener("beforeunload", function () {
		connection.postMessage(JSON.stringify({e: "pageEnd", p: pageId, u: location.href, t: tabId}));
	});
	// Exchange heartbeats
	let keepaliveMsg = JSON.stringify({e: "pageKeep", p: pageId, u: location.href, t: tabId});
	self.keepaliveTask = setInterval(function () {
		connection.postMessage(keepaliveMsg);
	}, 4000);
	self.agentActive = true;
} else {
	ics.debug("Repeated script injection.");
};