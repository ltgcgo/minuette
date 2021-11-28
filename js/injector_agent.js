"use strict";
{
	let connection = (self.browser || self.chrome).runtime.connect();
	let receiver = function (data) {
		let loader = document.createElement("script");
		loader.innerHTML = data;
		document.head.appendChild(loader);
	};
	connection.onMessage.addListener(receiver);
};
