"use strict";
let injectorAgentText, injectorText;

let tabListener = async function (data) {
	browser.tabs.executeScript(data.id, {code: injectorAgentText, allFrames: true, runAt: "document_start"});
};

let loadListener = async function (data) {
	tabListener(await browser.tabs.get(data.tabId));
};

let messageConnectionListener = async function (connection) {
	connection.postMessage(injectorText);
};

browser.webNavigation.onCommitted.addListener(loadListener);
browser.runtime.onConnect.addListener(messageConnectionListener);

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
