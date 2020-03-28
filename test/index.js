const frp = require('../FRP');
const e = frp.mkEvent();
const off = frp.consume(a => console.log({ a }), e);
frp.push(1, e);
frp.push(2, e);
frp.push(3, e);
off();
frp.push(4, e);

const e_t1 = frp.timer(1000);
const e_t2 = frp.timer(500);
const { signal, destroy } = frp.s_build((function* () {
	const s1 = yield* frp.s_from(e_t1, 0);
	const s2 = yield* frp.s_from(e_t2, 0);
	return yield* frp.s_zipWith((a, b) => ({ a, b }), s1, s2);
})());

frp.s_sub(a => console.log(a), signal);
window.setTimeout(destroy, 30000);
