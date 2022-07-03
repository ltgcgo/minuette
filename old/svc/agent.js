"use strict";
if (!self.agentActive) {
	let tabId = -ReplaceThisWithTabId-;
	let injectedAt = document.readyState;
	let connection, refreshConnection = function () {
		connection = chrome.runtime.connect();
		connection.onMessage.addListener(receiver);
		connection.onDisconnect.addListener(refreshConnection);
	};
	let pageId = "";
	let map = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
	let connectionId = "", primitive = new Uint8Array(16);
	self.crypto.getRandomValues(primitive);
	primitive.forEach(function (e) {
		connectionId += map[e % 64];
	});
	self.crypto.getRandomValues(primitive);
	primitive.forEach(function (e) {
		pageId += map[e % 64];
	});
	console.info("Exchanging information with extension channel: " + pageId);
	let receiver = function (data) {
		if (data.slice(0, 13) == "\"use strict\";") {
			if (!self.minuetteOn) {
				let loader = document.createElement("script");
				let injectData = data.replace("-ReplaceMeWithSomethingUnique-", connectionId);
				let blobUri = URL.createObjectURL(new Blob([injectData]));
				loader.src = blobUri;
				document.head.appendChild(loader);
				self.minuetteOn = document.readyState;
			};
		} else {
			console.info("Received command: " + data);
			let msg = JSON.parse(data);
			switch (msg.event) {
			};
		};
	};
	let pubReceiver = function (data) {
		let msg = JSON.parse(data);
		switch (msg.event) {
			case "monitorDisconnect":
			case "monitorConnect":
			default: {
				console.info("Public event: %o", msg);
			};
		};
	};
	refreshConnection();
	chrome.runtime.onMessage.addListener(pubReceiver);
	connection.postMessage(JSON.stringify({event: "pageStart", pid: pageId, url: location.href, tid: tabId, readyState: injectedAt}));
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
	console.info("Cross-context listening running on extension side: " + connectionId);
	addEventListener("beforeunload", function () {
		connection.postMessage(JSON.stringify({event: "pageEnd", pid: pageId, url: location.href, tid: tabId}));
	});
	let keepaliveMsg = JSON.stringify({event: "pageKeep", pid: pageId, url: location.href, tid: tabId});
	self.keepaliveTask = setInterval(function () {
		connection.postMessage(keepaliveMsg);
	}, 4000);
	self.agentActive = true;
} else {
	console.info("Repeated script injection.");
};
