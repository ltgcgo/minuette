"use strict";

let broadcastConnection;

{
	let connection = chrome.runtime.connect();
	let extChannel = "_ReplaceExtWithSomethingUnique_";
	console.info("Exchanging information with extension channel: " + extChannel);
	let map = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
	let connectionId = "", connectionPrimitive = new Uint8Array(16);
	self.crypto.getRandomValues(connectionPrimitive);
	connectionPrimitive.forEach(function (e) {
		connectionId += map[e % 64];
	});
	let receiver = function (data) {
		if (data.slice(0, 13) == "\"use strict\";") {
			let loader = document.createElement("script");
			let injectData = data.replace("-ReplaceMeWithSomethingUnique-", connectionId);
			let blobUri = URL.createObjectURL(new Blob([injectData]));
			loader.src = blobUri;
			document.head.appendChild(loader);
		} else {
			console.info("Received command: " + data);
			let msg = JSON.parse(data);
			switch (msg.event) {
				case "urlUnreg": {
					connection.postMessage(JSON.stringify({event: "tabReg", cid: extChannel, url: location.href, restore: true}));
					break;
				};
				case "reloadUnreg": {
					setTimeout(function () {
						connection = chrome.runtime.connect();
						connection.postMessage(JSON.stringify({event: "tabReg", cid: extChannel, url: location.href, restore: true}));
					}, 100);
					break;
				};
			};
		};
	};
	connection.onMessage.addListener(receiver);
	connection.postMessage(JSON.stringify({event: "tabReg", cid: extChannel, url: location.href}));
	broadcastConnection = new BroadcastChannel(connectionId);
	broadcastConnection.onmessage = function (msg) {
		let data = msg.data;
		if (data.noExt) {
			console.info(data);
		} else {
			msg.data.cid = extChannel;
			//console.info(msg.data);
			connection.postMessage(JSON.stringify(msg.data));
		};
	};
	console.info("Cross-context listening running on extension side: "+ connectionId);
	addEventListener("beforeunload", function () {
		connection.postMessage(JSON.stringify({event: "tabClose", cid: extChannel}));
	});
};

console.info("Injector agent is now active.");
