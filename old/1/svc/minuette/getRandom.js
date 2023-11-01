"use strict";

const map = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
let getRandom = function (length = 8) {
	let result = "";
	for (let c = 0; c < length; c ++) {
		result += map[Math.floor(Math.random() * 64)];
	};
	return result;
};

export {getRandom};