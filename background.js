'use strict';

// Chrome's Manifest V3 has no blocking webRequest API, so the Origin/Referer
// fix-up that Firefox did with webRequestBlocking is done here with a
// dynamic declarativeNetRequest rule instead. It only applies to requests
// whose initiator is this extension's own page (player.html) - i.e. requests
// the page context can't send correct Origin/Referer headers for itself.
const ORIGIN_REFERER_FIX_RULE_ID = 1;

const HOST_DOMAINS = chrome.runtime.getManifest().host_permissions.map(
	шаблон => шаблон.replace(/^\*:\/\/(?:\*\.)?/, '').replace(/\/\*$/, '')
);

async function ЗарегистрироватьПравилоЗаголовков() {
	await chrome.declarativeNetRequest.updateDynamicRules({
		removeRuleIds: [ ORIGIN_REFERER_FIX_RULE_ID ],
		addRules: [ {
			id: ORIGIN_REFERER_FIX_RULE_ID,
			priority: 1,
			action: {
				type: 'modifyHeaders',
				requestHeaders: [
					{ header: 'Origin', operation: 'set', value: 'https://www.twitch.tv' },
					{ header: 'Referer', operation: 'set', value: 'https://www.twitch.tv/' }
				]
			},
			condition: {
				initiatorDomains: [ chrome.runtime.id ],
				requestDomains: HOST_DOMAINS,
				resourceTypes: [ 'xmlhttprequest' ]
			}
		} ]
	});
}

ЗарегистрироватьПравилоЗаголовков();
chrome.runtime.onInstalled.addListener(ЗарегистрироватьПравилоЗаголовков);
chrome.runtime.onStartup.addListener(ЗарегистрироватьПравилоЗаголовков);

chrome.runtime.onMessage.addListener((оСообщение, оОтправитель, фОтветить) => {
	if (оСообщение.сЗапрос === 'ЗапуститьПроигрыватель' && оОтправитель.frameId === 0) {
		chrome.tabs.update(оОтправитель.tab.id, {
			url: `${chrome.runtime.getURL('player.html')}${оСообщение.сАдрес}`
		});
	}
});
