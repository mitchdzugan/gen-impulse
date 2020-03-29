const FRP_js = require('./FRP');
const DOM = require('./raw_src/DOM');
const FRP_raw = require('./raw_src/FRP');
const snabbdom = require('snabbdom');
var patch = snabbdom.init([
  require('snabbdom/modules/class').default,
  require('snabbdom/modules/attributes').default,
  require('snabbdom/modules/style').default,
  require('snabbdom/modules/eventlisteners').default,
]);
var h = require('snabbdom/h').default;
const SNABBDOM = { h, patch };

const { ask, exec } = require('gen-computation');

const FRP = FRP_raw.impl;
const runReader = (m) => (env) => exec(env)(m).result;

const attach = (id, env, dom, postRender = () => {}) => {
	return DOM.attachImpl_raw(SNABBDOM)(FRP)(id)(env)(postRender)(runReader(dom))();
};
const toMarkup = (env, dom) => {
	return DOM.toMarkupImpl_raw(SNABBDOM)(FRP)(env)(runReader(dom))();
};

const createElement = (tag, attrs = {}, inner_ = null) => (function* () {
	const inner = inner_ || (function* () {})();
	const domClass = yield* ask();
	const el = DOM.createElementImpl_raw(FRP)(tag)(attrs)(runReader(inner))(domClass);
	const events = [
		'click',
		'doubleclick',
		'change',
		'keyup',
		'keydown',
		'keypress',
		'mousedown',
		'mouseenter',
		'mouseleave',
		'mousemove',
		'mouseout',
		'mouseover',
		'mouseup',
		'transitionend',
		'scroll',
	];
	const upperFirst = s => s.replace(/^\w/, c => c.toUpperCase());
	for (const event of events) {
		Object.defineProperty(el, `on${upperFirst(event)}`, {
			get: () => el.mkOn(event)
		});
	}
	return el;
})();
const text = (s) => (function* () {
	const domClass = yield* ask();
	return DOM.textImpl(s)(domClass);
})();
const env = () => (function* () {
	const domClass = yield* ask();
	return DOM.envImpl(domClass);
})();
const getEnv = (key) => (function* () {
	const e = yield* env();
	return e[key];
})();
const withAlteredEnv = (f, inner) => (function* () {
	const domClass = yield* ask();
	return DOM.withAlteredEnvImpl(f)(runReader(inner))(domClass);
})();
const upsertEnv = (key, val, inner) => (function* (){
	return yield* withAlteredEnv((e) => ({ ...e, [key]: val }), inner);
})();
const keyed = (key, inner) => (function* () {
	const domClass = yield* ask();
	return DOM.keyedImpl(key)(runReader(inner))(domClass);
})();
const e_collect = (key, innerFromEvent) => (function* () {
	const domClass = yield* ask();
	const addColl = colls => coll => ({ ...colls, [key]: coll });
	const getColl = colls => colls[key];
	const runFromEvent = e => runReader(innerFromEvent(e));
	return DOM.e_collectImpl_raw(FRP)(addColl)(getColl)(runFromEvent)(domClass);
})();
const e_collectAndReduce = (key, reducer, init, inner) => (function* () {
	return yield* e_collect(key, (e_emits) => (function* () {
		const e = FRP_js.reduce(reducer, init, e_emits);
		const s = yield* s_use(FRP_js.s_from(e, init));
		return yield* upsertEnv(key, s, inner);
	}()));
})();
const e_emit = (key, e) => (function* () {
	const domClass = yield* ask();
	const getColl = colls => colls[key];
	return DOM.e_emitImpl(getColl)(e)(domClass);
})();
const e_consume = (f, e) => (function* () {
	const domClass = yield* ask();
	return DOM.e_consumeImpl_raw(FRP)(v => () => f(v))(e)(domClass);
})();
const s_use = (sigBuild) => (function* () {
	const domClass = yield* ask();
	return DOM.s_useImpl(() => FRP_js.s_build(sigBuild))(domClass);
})();
const s_bindDOM = (s, innerFromCurr) => (function* () {
	const domClass = yield* ask();
	const runFromCurr = v => runReader(innerFromCurr(v));
	return DOM.s_bindDOMImpl_raw(FRP)(s)(runFromCurr)(domClass);
})();
const d_stash = (inner) => (function* () {
	const domClass = yield* ask();
	return DOM.d_stashImpl(runReader(inner))(domClass);
})();
const d_apply = (stash) => (function* () {
	const domClass = yield* ask();
	return DOM.d_applyImpl(stash)(domClass);
})();
const d_memo = (hash, val, innerFromVal) => (function* () {
	const domClass = yield* ask();
	const runFromVal = v => runReader(innerFromVal(v));
	return DOM.d_memoImpl(hash)(val)(runFromVal)(domClass);
})();

exports.attach = attach;
exports.toMarkup = toMarkup;
exports.createElement = createElement;
exports.text = text;
exports.env = env;
exports.getEnv = getEnv;
exports.withAlteredEnv = withAlteredEnv;
exports.upsertEnv = upsertEnv;
exports.keyed = keyed;
exports.e_collect = e_collect;
exports.e_collectAndReduce = e_collectAndReduce;
exports.e_emit = e_emit;
exports.e_consume = e_consume;
exports.s_use = s_use;
exports.s_bindDOM = s_bindDOM;
exports.d_stash = d_stash;
exports.d_apply = d_apply;
exports.d_memo = d_memo;

const tags = [
	"a","abbr","acronym","address","applet","area","article","aside","audio","b","base","basefont","bdo",
	"big","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup",
	"datalist","dd","del","dfn","div","dl","dt","em","embed","fieldset","figcaption","figure","font",
	"footer","form","frame","frameset","head","header","h1 to &lt;h6&gt;","hr","html","i","iframe","img",
	"input","ins","kbd","label","legend","li","link","main","map","mark","meta","meter","nav","noscript",
	"object","ol","optgroup","option","p","param","pre","progress","q","s","samp","script","section",
	"select","small","source","span","strike","strong","style","sub","sup","table","tbody","td",
	"textarea","tfoot","th","thead","time","title","tr","u","ul","var","video","wbr"
];

for (const tag of tags) {
	exports[tag] = (...args) => createElement(tag, ...args);
}
