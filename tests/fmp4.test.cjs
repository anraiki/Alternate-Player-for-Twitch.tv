'use strict';
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const player = readFileSync(join(__dirname, '../player.js'), 'utf8');
const worker = readFileSync(join(__dirname, '../worker.js'), 'utf8');
function extract(source, name) {
 const start = source.indexOf(`\tfunction ${name}(`);
 const end = source.indexOf('\n\tfunction ', start + 1);
 assert.ok(start >= 0 && end > start, name);
 return source.slice(start, end);
}
function fixture(name) {
 const bytes = readFileSync(join(__dirname, 'fixtures/fmp4', name));
 return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
const helper = worker.slice(worker.indexOf('function prepareFragmentedMP4('), worker.indexOf('var ДЕЛАТЬ_ПЕРВЫЙ'));
const context = vm.createContext({Uint8Array, DataView});
vm.runInContext(helper, context);
const prepare = (media = fixture('segment0.m4s'), init = fixture('init.mp4')) => context.prepareFragmentedMP4(init, media, 'avc1.4D401F,mp4a.40.2');

test('real H.264/AAC fragments pass through unchanged with actual codec and timing metadata', () => {
 const media = fixture('segment0.m4s'), result = prepare(media);
 assert.equal(result.мбМедиасегмент.buffer, media);
 assert.equal(result.лЕстьВидео, true);
 assert.equal(result.лЕстьЗвук, true);
 assert.equal(result.чШиринаКартинки, 64);
 assert.equal(result.чВысотаКартинки, 64);
 assert.match(result.сКодеки, /^video\/mp4;codecs="avc1\.[0-9a-f]{6},mp4a.40.2"$/);
 assert.ok(Number.isFinite(result.чПозицияКодирования));
 assert.ok(prepare(fixture('segment1.m4s')).чПозицияКодирования > result.чПозицияКодирования);
});

test('truncated, oversized, and untimed MP4 fragments fail before reaching MSE', () => {
 assert.throws(() => prepare(new ArrayBuffer(7)), /Truncated/);
 const invalid = fixture('segment0.m4s');
 new DataView(invalid).setUint32(0, 0xffffffff);
 assert.throws(() => prepare(invalid), /Invalid MP4 box size/);
 assert.throws(() => prepare(fixture('init.mp4')), /no media data/);
});

test('encrypted MP4 sample entries are rejected even without a playlist key', () => {
 const bytes = Buffer.from(fixture('init.mp4'));
 const index = bytes.indexOf('avc1');
 assert.ok(index >= 0);
 bytes.write('encv', index);
 assert.throws(() => prepare(fixture('segment0.m4s'), bytes.buffer), /Encrypted MP4/);
});

function playlistContext() {
 const noop = () => {};
 const errors = [];
 const ctx = vm.createContext({
  Проверить: value => assert.ok(value),
  ResolveRelativeUrl: (value, base) => new URL(value, base).href,
  м_Отладка: {ЗавершитьРаботуИПоказатьСообщение: code => {errors.push(code); throw undefined;}},
  м_Twitch: {ПолучитьАдресКанала: () => '', этоРекламныйСегмент: () => false},
  м_Журнал: {Вот: noop, Ой: noop, Окак: noop},
  м_Статистика: {РазобранСписокСегментов: noop},
 });
 for (const name of ['РазобратьСписок', 'РазобратьСписокАтрибутов', 'РазобратьЦелоеПоложительноеЧисло', 'РазобратьПоложительноеЧисло', 'РазобратьЛюбоеЧисло', 'разобратьEXTINF', 'браковать']) {
  vm.runInContext(extract(player, name), ctx);
 }
 ctx.errors = errors;
 return ctx;
}
const prefix = '#EXTM3U\n#EXT-X-VERSION:6\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:10\n';
function parse(text) {return playlistContext().РазобратьСписок(false, 'https://example.com/hls/list.m3u8', prefix + text);}

test('MAP applies to each following segment and resolves relative initialization URLs', () => {
 const result = parse('#EXT-X-MAP:URI="init.mp4"\n#EXTINF:2,live\na.mp4\n#EXT-X-MAP:URI="other.mp4"\n#EXT-X-DISCONTINUITY\n#EXTINF:2,live\nb.mp4\n');
 assert.equal(result.моСегменты[0].initialization, 'https://example.com/hls/init.mp4');
 assert.equal(result.моСегменты[1].initialization, 'https://example.com/hls/other.mp4');
 assert.equal(result.моСегменты[1].лРазрыв, true);
});

test('unencrypted TS and METHOD=NONE continue to parse; actual encryption stays blocked', () => {
 const result = parse('#EXT-X-KEY:METHOD=NONE\n#EXTINF:2,live\na.ts\n');
 assert.equal(result.моСегменты[0].initialization, null);
 for (const method of ['AES-128', 'SAMPLE-AES', 'SAMPLE-AES-CTR']) {
  const ctx = playlistContext();
  ctx.РазобратьСписок(false, 'https://example.com/list.m3u8', prefix + `#EXT-X-KEY:METHOD=${method},URI="key"\n#EXTINF:2,live\na.mp4\n`);
  assert.deepEqual(ctx.errors, ['J0219']);
 }
});

test('worker preserves ordering, reinitializes at map changes and discontinuities, and returns to TS conversion', () => {
 const outputs = [];
 let tsConversions = 0;
 const ctx = vm.createContext({
  Uint8Array, DataView,
  _оИсходныйСегмент: null, _лРазрыв: false, lastMP4Initialization: null,
  ОтправитьРезультат: transfers => outputs.push({segment: ctx._оИсходныйСегмент, transfers}),
  ОбработатьСменуСостояния: () => outputs.push({segment: ctx._оИсходныйСегмент}),
  ПреобразоватьСегмент: () => {tsConversions++; assert.equal(ctx._лРазрыв, true);},
  ЗавершитьРаботуИПоказатьСообщение: code => {throw new Error(code);},
 });
 vm.runInContext(helper + extract(worker, 'processFragmentedMP4') + extract(worker, 'ОбработатьСообщение'), ctx);
 const send = (number, url = 'init.mp4', discontinuity = false) => ctx.ОбработатьСообщение({
  чНомер: number, лРазрыв: discontinuity, пДанные: fixture('segment0.m4s'),
  fmp4: {url, initialization: fixture('init.mp4'), codecs: 'avc1.4D401F,mp4a.40.2'},
 });
 send(1); send(2); send(3, 'next.mp4'); send(4, 'next.mp4', true);
 ctx.ОбработатьСообщение({чНомер: 5, пДанные: 9});
 send(6, 'next.mp4');
 ctx.ОбработатьСообщение({чНомер: 7, пДанные: new ArrayBuffer(188)});
 assert.deepEqual(outputs.map(output => output.segment.чНомер), [1, 2, 3, 4, 5, 6]);
 assert.deepEqual(outputs.filter(output => output.transfers).map(output => output.transfers.length), [2, 1, 2, 2, 2]);
 assert.equal(outputs[1].segment.лРазрыв, false);
 assert.equal(outputs[0].segment.fmp4, undefined);
 assert.equal(tsConversions, 1);
});

test('playlist timing metadata follows media duration for latency and clip positions', () => {
 const segments = parse('#EXT-X-TWITCH-ELAPSED-SECS:100\n#EXT-X-PROGRAM-DATE-TIME:2026-09-23T09:57:01Z\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:2,live\na.mp4\n#EXTINF:2,live\nb.mp4\n').моСегменты;
 assert.equal(segments[0].streamPosition, 100);
 assert.equal(segments[1].streamPosition, 102);
 assert.equal(segments[1].programTime, Date.parse('2026-09-23T09:57:03Z'));
});

test('initialization downloads are reused, bounded, retryable, and respect cancellation', async () => {
 const calls = [], data = fixture('init.mp4');
 const cancelled = new Error('cancelled');
 let fail = false;
 const ctx = vm.createContext({
  ЗагружатьСегментНеДольше: () => 10000,
  Загрузить: async (...args) => {
   calls.push(args);
   if (args[0].лОтменено) throw cancelled;
   if (fail) throw new Error('network failure');
   return data;
  },
 });
 const start = player.indexOf('\tconst initializationCache =');
 vm.runInContext(player.slice(start, player.indexOf('\tfunction ЗагрузитьСегмент(', start)), ctx);
 const load = async (url, cancellation = {}) => {
  const segment = {fmp4: {url}};
  await ctx.loadInitialization(segment, cancellation);
  return segment;
 };
 assert.equal((await load('one')).fmp4.initialization, data);
 await load('one');
 assert.equal(calls.length, 1);
 assert.equal(calls[0][8], 'arraybuffer');
 fail = true;
 await assert.rejects(load('retry'), /network failure/);
 fail = false;
 await load('retry');
 await assert.rejects(load('cancel', {лОтменено:true}), error => error === cancelled);
 for (const url of ['two', 'three', 'four', 'five']) await load(url);
 assert.equal(vm.runInContext('initializationCache.size', ctx), 4);
 assert.equal(vm.runInContext('initializationCache.has("one")', ctx), false);
});

test('binary initialization requests use arraybuffer and retain the existing cancellation check', async () => {
 const requests = [], cancelled = new Error('cancelled');
 const ctx = vm.createContext({
  г_лРаботаЗавершена: false, МАКС_КОЛИЧЕСТВО_ПОПЫТОК: 2,
  Проверить: value => assert.ok(value), URLSearchParams, performance,
  ОтменаОбещания: {ПРИЧИНА: cancelled},
  м_Журнал: {Вот: () => {}, F0: String},
  м_Twitch: {проверитьДоступностьАдреса: () => {}},
  ОбработатьОшибку: () => {}, ОбработатьОкончаниеЗагрузки: () => {},
  XMLHttpRequest: class {
   constructor() {requests.push(this);}
   addEventListener() {}
   open(method, url) {this.method = method; this.url = url;}
   send() {this._фВыполнить(fixture('init.mp4'));}
  },
 });
 vm.runInContext(extract(player, 'Загрузить') + extract(player, 'ПослатьЗапрос'), ctx);
 await ctx.Загрузить(null, 'GET', 'https://example.com/init.mp4', 10000, null, null, 'MP4 initialization', false, 'arraybuffer');
 assert.equal(requests[0].responseType, 'arraybuffer');
 await assert.rejects(ctx.Загрузить({лОтменено:true}, 'GET', 'https://example.com/init.mp4', 10000, null, null, 'MP4 initialization', false, 'arraybuffer'), error => error === cancelled);
 assert.equal(requests.length, 1);
});
