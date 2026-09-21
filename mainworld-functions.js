'use strict';

let _лНеПерехватывать = false;
window.addEventListener('tw5-неперехватывать', () => {
	_лНеПерехватывать = true;
});
const oTitleDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
Object.defineProperty(document, 'title', {
	configurable: oTitleDescriptor.configurable,
	enumerable: oTitleDescriptor.enumerable,
	get() {
		return oTitleDescriptor.get.call(this);
	},
	set(title) {
		if (_лНеПерехватывать) {
			oTitleDescriptor.set.call(this, title);
		} else if (this.documentElement.hasAttribute('data-tw5-перенаправление')) {} else {
			oTitleDescriptor.set.call(this, title);
			window.dispatchEvent(new CustomEvent('tw5-изменензаголовок'));
		}
	}
});
const fPushState = history.pushState;
history.pushState = function(state, title) {
	if (_лНеПерехватывать) {
		fPushState.apply(this, arguments);
	} else if (document.documentElement.hasAttribute('data-tw5-перенаправление')) {} else {
		const сБыло = location.pathname;
		fPushState.apply(this, arguments);
		if (сБыло !== location.pathname) {
			oTitleDescriptor.set.call(document, 'Twitch');
			window.dispatchEvent(new CustomEvent('tw5-pushstate'));
		}
	}
};
