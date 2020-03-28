const frp = require('../FRP');
const DOM = require('../DOM');

const e = frp.mkEvent();
const off = frp.consume(a => console.log({ a }), e);
frp.push(1, e);
frp.push(2, e);
frp.push(3, e);
off();
frp.push(4, e);

const e_t1 = frp.timer(1000);
const e_t2 = frp.timer(500);
const res = frp.s_build((function* () {
	const s1 = yield* frp.s_from(e_t1, 0);
	const s2 = yield* frp.s_from(e_t2, 0);
	return yield* frp.s_zipWith((a, b) => ({ a, b }), s1, s2);
})());
const { signal, destroy } = res;

frp.s_sub(a => console.log(a), signal);
window.setTimeout(destroy, 30000);

const changeScoreButton = (change, message) => (function* () {
	const d_button = yield* DOM.button({ className: "Test" }, DOM.text(message));
	yield* DOM.e_emit('counter', frp.fmap(() => change, d_button.onClick));
})();

const displayScore = () => (function* () {
	const s_count = yield* DOM.getEnv('counter');
	yield* DOM.s_bindDOM(s_count, (count) => (function* () {
		yield* DOM.span({}, DOM.text(`Points: ${count}`));
	})());
})();

const dom = (function* () {
	yield* DOM.div({}, DOM.text('Hello'));
	yield* DOM.e_collectAndReduce('counter', (agg, change) => agg + change, 0, (function* () {
		yield* changeScoreButton( 1, 'Click for (+1)');
		yield* displayScore();
		yield* changeScoreButton(-1, 'Click for (-1)');
	})());
})();
DOM.attach('app', null, dom);
