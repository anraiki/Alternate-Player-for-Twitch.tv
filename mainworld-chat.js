'use strict';

const fGetItem = Storage.prototype.getItem;
Storage.prototype.getItem = function(сИмя) {
	let сЗначение = fGetItem.apply(this, arguments);
	if (сИмя === 'TwitchCache:Layout' && сЗначение) {
		сЗначение = сЗначение.replace('"isRightColumnClosedByUserAction":true', '"isRightColumnClosedByUserAction":false');
	}
	return сЗначение;
};
