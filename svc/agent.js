"use strict";
import {ics} from "./ics.js";
ics.level = 3;
const map = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

if (!self.agentActive) {
	// Injection start
	let tabId = "-ReplaceThisWithTabId-";
	let injectedAt = document.readyState;
	ics.debug(`Injected as tab ${tabId}, on ${injectedAt}.`);
	// Attempt to connect to the extension backend
	let connection, refreshConnection = function () {
		connection = chrome.runtime.connect();
		connection.onMessage.addListener(receiver);
		connection.onDisconnect.addListener(refreshConnection);
	};
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
	// Message exchange with the page
	let bridgeConnection = new BroadcastChannel(connectionId);
	bridgeConnection.onmessage = function (msg) {
		let data = msg.data;
		if (data.noExt) {
			console.info(data);
		} else {
			msg.data.cid = extChannel;
			connection.postMessage(JSON.stringify(msg.data));
		};
	};
	ics.debug(`Cross-context listening running on extension side: ${connectionId}`);
	// Generic extension private message receiver
	/*let receiver = function (data) {
		if (data.slice(0, 13) == "\"use strict\";") {
			if (!self.minuetteOn) {
				ics.debug(`Injection payload received.`);
				let loader = document.createElement("script");
				let injectData = data.replace("-ReplaceMeWithSomethingUnique-", connectionId);
				let blobUri = URL.createObjectURL(new Blob([injectData]));
				loader.src = blobUri;
				document.head.appendChild(loader);
				self.minuetteOn = document.readyState;
			};
		} else {
			ics.debug("Received command: " + data);
			let msg = JSON.parse(data);
			switch (msg.event) {
			};
		};
	};
	refreshConnection();*/
	// Signal Minuette the launch of injection agent
	connection.postMessage(JSON.stringify({event: "pageStart", pid: pageId, url: location.href, tid: tabId, readyState: injectedAt}));
	// Generic extension public message receiver
	let pubReceiver = function (data) {
		let msg = JSON.parse(data);
		switch (msg.event) {
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
		connection.postMessage(JSON.stringify({event: "pageEnd", pid: pageId, url: location.href, tid: tabId}));
	});
	// Exchange heartbeats
	let keepaliveMsg = JSON.stringify({event: "pageKeep", pid: pageId, url: location.href, tid: tabId});
	self.keepaliveTask = setInterval(function () {
		connection.postMessage(keepaliveMsg);
	}, 4000);
	self.agentActive = true;
} else {
	ics.debug("Repeated script injection.");
};