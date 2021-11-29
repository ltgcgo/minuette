"use strict";
let injectorAgentText, injectorText, selfExtSource, tracking = {}, trackingUrls = {};

let map = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

let tabListener = async function (data) {
	console.info(data);
	if (data.url.indexOf("chrome://") == 0 || data.url.indexOf("about:") == 0) {
		console.debug("Skipped interception on browser's internal pages.");
	} else if (data.url.indexOf(selfExtSource) == 0) {
		console.debug("Skipped interception on Minuette pages.");
	} else {
		let connectionId = "", connectionPrimitive = new Uint8Array(16);
		self.crypto.getRandomValues(connectionPrimitive);
		connectionPrimitive.forEach(function (e) {
			connectionId += map[e % 64];
		});
		if (!trackingUrls[data.url]) {
			trackingUrls[data.url] = new Set();
		};
		trackingUrls[data.url].add(connectionId);
		browser.tabs.executeScript(data.id, {code: injectorAgentText.replace("_ReplaceExtWithSomethingUnique_", connectionId), allFrames: true, runAt: "document_start"});
		console.debug("Interception started on tab " + data.id + "(" + connectionId + "): " + data.url + ".");
	};
};

let frameCloseListener = async function (cid) {
	if (tracking[cid]) {
		tracking[cid].port.disconnect();
		delete tracking[cid];
	};
};

let tabCloseListener = async function (data) {
	/* console.info(data);
	if (trackingUrls[data.url]) {
		trackingUrls[data.url].forEach(function (cid) {
			tracking[cid].port.postMessage(JSON.stringify({event: "urlUnreg", url: data.url}));
			console.debug("Interception stopped on tab " + data.id + "(" + cid + "): " + data.url + ".");
			delete tracking[cid];
		});
		delete trackingUrls[data.url];
	}; */
};

let loadListener = async function (data) {
	//console.info(data);
	tabListener(await browser.tabs.get(data.tabId));
};

let unloadListener = async function (data) {
	//console.info(data);
	tabCloseListener(await browser.tabs.get(data.tabId));
};

let messageConnectionListener = async function (connection) {
	connection.postMessage(injectorText);
	connection.onMessage.addListener(function (data) {
		let msg = JSON.parse(data);
		switch (msg.event) {
			case "tabReg": {
				if (!tracking[msg.cid]) {
					tracking[msg.cid] = {};
					tracking[msg.cid].port = connection;
					tracking[msg.cid].elements = {};
					tracking[msg.cid].url = msg.url;
					if (!trackingUrls[msg.url]) {
						trackingUrls[msg.url] = new Set();
					};
					trackingUrls[msg.url].add(msg.cid);
					console.info(msg.restore ? `Connection to ${msg.cid} restored.` : `Established connection to ${msg.cid}.`);
				};
				break;
			};
			case "tabClose": {
				frameCloseListener(msg.cid);
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
				console.info(msg);
			};
		};
	});
};

browser.webNavigation.onCommitted.addListener(loadListener);
browser.webNavigation.onBeforeNavigate.addListener(unloadListener);
browser.runtime.onConnect.addListener(messageConnectionListener);

selfExtSource = browser.runtime.getURL("/");

addEventListener("beforeunload", function () {
	for (let cid in tracking) {
		tracking[cid].port.postMessage(JSON.stringify({event: "reloadUnreg"}));
	};
});

let task = setInterval(function () {
	fetch("js/injector_agent.js").then(function (response) {
		return response.text();
	}).then(function (data) {
		injectorAgentText = data;
	});
	fetch("js/injector.js").then(function (response) {
		return response.text();
	}).then(function (data) {
		injectorText = data;
	});
}, 2500);
