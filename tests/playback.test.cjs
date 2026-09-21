'use strict';
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');

const source = readFileSync(join(__dirname, '../player.js'), 'utf8');
const start = source.indexOf('\tfunction requestPlayback() {');
const end = source.indexOf('\n\tfunction ', start + 1);
assert.ok(start >= 0 && end > start);
const helper = source.slice(start, end);

function setup(play) {
 const logs = [], reports = [];
 let stops = 0;
 const context = vm.createContext({
  _oMediaElement: {play},
  г_лРаботаЗавершена: false,
  м_Журнал: {Ой: message => logs.push(message)},
  м_Управление: {ОстановитьПросмотрТрансляции: () => stops++},
  м_Отладка: {ПойманоИсключение: error => {
   reports.push(error);
   context.г_лРаботаЗавершена = true;
   throw undefined; // Match the player's existing fatal-error reporter.
  }},
  console: {error: (...args) => logs.push(args)}
 });
 vm.runInContext(helper, context);
 return {context, logs, reports, stops: () => stops};
}

test('successful playback does not stop or report an error', async () => {
 const state = setup(() => Promise.resolve());
 await state.context.requestPlayback();
 assert.equal(state.stops(), 0);
 assert.deepEqual(state.logs, []);
 assert.deepEqual(state.reports, []);
});

test('pause interrupts a pending play request without an unhandled rejection', async () => {
 let interrupt;
 const state = setup(() => new Promise((resolve, reject) => {interrupt = reject;}));
 const pending = state.context.requestPlayback();
 interrupt(new DOMException('Interrupted by pause()', 'AbortError'));
 await pending;
 assert.equal(state.stops(), 0);
 assert.deepEqual(state.logs, []);
 assert.deepEqual(state.reports, []);
});

test('autoplay denial stops playback and logs an English recovery instruction', async () => {
 const state = setup(() => Promise.reject(new DOMException('Autoplay denied', 'NotAllowedError')));
 await state.context.requestPlayback();
 assert.equal(state.stops(), 1);
 assert.match(state.logs[0], /Click Play/);
 assert.deepEqual(state.reports, []);
});

test('unexpected failure reaches the fatal reporter without leaking its shutdown exception', async () => {
 const error = new DOMException('Unsupported media', 'NotSupportedError');
 const state = setup(() => Promise.reject(error));
 await state.context.requestPlayback();
 assert.deepEqual(state.reports, [error]);
 assert.deepEqual(state.logs, []);
});

test('late playback rejection does not restart error handling after shutdown', async () => {
 const state = setup(() => Promise.reject(new DOMException('Autoplay denied', 'NotAllowedError')));
 state.context.г_лРаботаЗавершена = true;
 await state.context.requestPlayback();
 assert.equal(state.stops(), 0);
 assert.deepEqual(state.logs, []);
});
