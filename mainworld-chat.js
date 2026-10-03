'use strict';

const fGetItem = Storage.prototype.getItem;
Storage.prototype.getItem = function(сИмя) {
	let сЗначение = fGetItem.apply(this, arguments);
	if (сИмя === 'TwitchCache:Layout' && сЗначение) {
		сЗначение = сЗначение.replace('"isRightColumnClosedByUserAction":true', '"isRightColumnClosedByUserAction":false');
	}
	return сЗначение;
};

window.addEventListener('tw5-загрузитьдополнения', async оСобытие => {
	function вставить(сТег, оСвойства) {
		const узЭлемент = Object.assign(document.createElement(сТег), оСвойства);
		(document.head || document.documentElement).appendChild(узЭлемент);
	}
	for (const сНазвание of JSON.parse(оСобытие.detail)) {
		switch (сНазвание) {
		  case 'FrankerFaceZ':
			вставить('script', {src: 'https://cdn.frankerfacez.com/script/script.min.js'});
			break;

		  case 'BetterTTV':
			вставить('script', {src: 'https://cdn.betterttv.net/betterttv.js'});
			break;

		  case '7TV': {
			// The hosted build of 7TV reads its file list from window.seventv.
			const оМанифест = await (await fetch('https://extension.7tv.gg/manifest.json')).json();
			window.seventv = {remote: true, host_manifest: оМанифест};
			вставить('link', {rel: 'stylesheet', href: оМанифест.stylesheet_file});
			вставить('script', {id: 'seventv-extension', type: 'module', src: оМанифест.index_file});
			break;
		  }
		}
	}
}, {once: true});
