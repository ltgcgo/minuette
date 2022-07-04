"use strict";
// Get the CSS selector of an element
let getCSSSelector = function (element, includeSmart) {
	let text = (element.tagName || "null").toLowerCase();
	if (element.id) {
		text += "#" + element.id;
	};
	if (element.className) {
		element.classList.forEach(function (e) {
			text += "." + e;
		});
	};
	if (includeSmart) {
		for (let count = 0; count < element.attributes.length; count ++) {
			let target = element.attributes[count];
			if (selectorSkip.indexOf(target.name) == -1) {
				text += "[" + target.name + "=" + target.value + "]";
			};
		};
	};
	return text;
};
export {getCSSSelector};