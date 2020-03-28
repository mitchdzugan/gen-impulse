const { impl } = require('./raw_src/FRP');
const { ask, exec } = require('gen-computation');

exports.mkEvent = impl.mkEventJS;
exports.push = (v, e) => impl.pushJS(v)(e);
exports.consume = (f, e) => impl.consumeJS(f)(e);
exports.rebuildBy = (toNexts, e) => impl.rebuildBy(toNexts)(e);
exports.fmap = (f, e) => impl.fmap(f)(e);
exports.filter = (p, e) => impl.filter(p)(e);
exports.reduce = (r, i, e) => impl.reduce(r)(i)(e);
exports.flatMap = (toEvent, e) => impl.flatMap(toEvent)(e);
exports.join = impl.join;
exports.dedup = (e, eq = (a, b) => a == b) => impl.dedupImpl(eq)(e);
exports.preempt = (e_fromRes, f) => impl.preempt(e_fromRes)(f);
exports.never = impl.never;
exports.tagWith = (f, tagged, tagger) => impl.tagWith(f, tagged, tagger);
exports.timer = impl.timer;
exports.debounce = (ms, e) => impl.debounce(ms)(e);
exports.throttle = (ms, e) => impl.throttle(ms)(e);
exports.deferOff = (ms, e) => impl.deferOff(ms)(e);
exports.s_destroy = (s) => impl.s_destroy(s)();
exports.s_subRes = impl.s_subRes;
exports.s_unsub = (arg) => impl.s_unsub(arg)();
exports.s_sub = (f, s) => impl.s_sub(v => () => f(v))(s)();
exports.s_inst = (s) => impl.s_inst(s)();
exports.s_changed = impl.s_changed;
exports.s_tagWith = (f, e, s) => impl.s_tagWith(f)(e)(s);
exports.s_from = (changed, init) => (function* () {
	const sigClass = yield* ask();
	return impl.s_fromImpl(changed)(init)(sigClass);
})();
exports.s_fmap = (f, s) => (function* () {
	const sigClass = yield* ask();
	return impl.s_fmapImpl(f)(s)(sigClass);
})();
exports.s_const = (v) => (function* () {
	const sigClass = yield* ask();
	return impl.s_constImpl(v)(sigClass);
})();
exports.s_zipWith = (f, s1, s2) => (function* () {
	const sigClass = yield* ask();
	return impl.s_zipWithImpl(a => b => f(a, b))(s1)(s2)(sigClass);
})();
exports.s_flatten = (ss) => (function* () {
	const sigClass = yield* ask();
	return impl.s_flattenImpl(ss)(sigClass);
})();
exports.s_dedup = (s, eq = (a, b) => a == b) => (function* () {
	const sigClass = yield* ask();
	return impl.s_dedupImpl(eq)(s)(sigClass);
})();
exports.s_build = (builder) => {
	const fromSigClass = (sigClass) => {
		const ires = exec(sigClass)(builder);
		return ires.result;
	};
	return impl.s_buildImpl(fromSigClass)();
};
