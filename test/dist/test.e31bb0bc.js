// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"../raw_src/FRP.js":[function(require,module,exports) {
"use strict";

var nextId = 1;

var mkEventJS = function mkEventJS() {
  var onRequired = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {
    return function () {};
  };
  var id = nextId;
  nextId = id + 1;
  return {
    id: id,
    nextSubscriberId: 0,
    subscribers: {},
    consumerCount: 0,
    onRequired: onRequired,
    offCallback: function offCallback() {}
  };
};

var pushCount = 0;

var pushJS = function pushJS(value) {
  return function (event) {
    var subscribers = event.subscribers;
    pushCount++;
    Object.values(subscribers).forEach(function (handler) {
      return handler(value, pushCount);
    });
  };
};

var consumeJS = function consumeJS(f) {
  return function (event) {
    var nextSubscriberId = event.nextSubscriberId;

    if (!event.consumerCount) {
      event.offCallback = event.onRequired(function (value) {
        return pushJS(value)(event);
      });
    }

    event.consumerCount += 1;
    var subscriberId = nextSubscriberId;
    event.nextSubscriberId = subscriberId + 1;
    event.subscribers[subscriberId] = f;
    return function () {
      if (event.subscribers[subscriberId]) {
        event.consumerCount -= 1;

        if (!event.consumerCount) {
          event.offCallback();
        }

        delete event.subscribers[subscriberId];
      }
    };
  };
}; // -- mkEvent :: forall a. ((a -> Effect Unit) -> Effect (Effect Unit)) -> Event a


var mkEvent = function mkEvent() {
  var onRequired = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {
    return function () {
      return function () {
        return function () {};
      };
    };
  };
  return mkEventJS(function (pushSelf) {
    return onRequired(function (v) {
      return function () {
        return pushSelf(v);
      };
    })();
  });
}; // -- push :: forall a. a -> Event a -> Effect Unit


var push = function push(value) {
  return function (event) {
    return function () {
      return pushJS(value)(event);
    };
  };
}; // -- consume :: forall a. (a -> Effect Unit) -> Event a -> Effect (Effect Unit)


var consume = function consume(f) {
  return function (event) {
    return function () {
      return consumeJS(function (v) {
        return f(v)();
      })(event);
    };
  };
}; // -- rebuildBy :: forall a b. (a -> Array b) -> Event a -> Event b


var rebuildBy = function rebuildBy(toNexts) {
  return function (event) {
    return mkEventJS(function (pushSelf) {
      return consumeJS(function (curr) {
        return toNexts(curr).forEach(pushSelf);
      })(event);
    });
  };
}; // -- fmap :: forall a b. (a -> b) -> Event a -> Event b


var fmap = function fmap(f) {
  return function (event) {
    return rebuildBy(function (v) {
      return [f(v)];
    })(event);
  };
}; // -- filter :: forall a. (a -> Boolean) -> Event a -> Event a


var filter = function filter(pred) {
  return function (event) {
    return rebuildBy(function (v) {
      return pred(v) ? [v] : [];
    })(event);
  };
}; // -- reduce :: forall a b. (a -> b -> a) -> a -> Event b -> Event a


var reduce = function reduce(reducer) {
  return function (init) {
    return function (event) {
      var agg = init;
      return rebuildBy(function (curr) {
        agg = reducer(agg)(curr);
        return [agg];
      })(event);
    };
  };
}; // -- flatMap :: forall a b. (a -> Event b) -> Event a -> Event b


var flatMap = function flatMap(toEvent) {
  return function (event) {
    var currOff = function currOff() {};

    var fullOff = function fullOff() {};

    return mkEventJS(function (pushSelf) {
      fullOff = consumeJS(function (curr) {
        currOff();
        var innerE = toEvent(curr);
        currOff = consumeJS(pushSelf)(innerE);
      })(event);
      return function () {
        currOff();
        fullOff();

        currOff = function currOff() {};

        fullOff = function fullOff() {};
      };
    });
  };
}; // -- join :: forall a. Array (Event a) -> Event a


var join = function join(events) {
  var maxPushCountById = {};
  return mkEventJS(function (pushSelf) {
    var offs = events.map(function (event) {
      return consumeJS(function (value, pushCount) {
        var maxPushCount = maxPushCountById[event.id] || 0;

        if (pushCount <= maxPushCount) {
          console.log('skipping due to out of order');
          return;
        }

        maxPushCountById[event.id] = pushCount;
        pushSelf(value);
      })(event);
    });
    return function () {
      offs.map(function (off) {
        return off();
      });
    };
  });
}; // -- dedupImpl :: forall a. (a -> a -> Boolean) -> Event a -> Event a


var dedupImpl = function dedupImpl(eq) {
  return function (event) {
    var isFirst = true;
    var prev;
    return mkEventJS(function (pushSelf) {
      var off = consumeJS(function (curr) {
        if (isFirst || !eq(prev)(curr)) {
          pushSelf(curr);
          prev = curr;
        }

        isFirst = false;
      })(event);
      return function () {
        off();
        isFirst = true;
      };
    });
  };
}; // -- never :: forall a. Event a


var never = mkEventJS(function () {
  never.subscribers = {};
  return function () {
    never.subscribers = {};
  };
}); // -- preempt :: forall a b. (b -> Event a) -> (Event a -> b) -> b

var preempt = function preempt(e_fromRes) {
  return function (f) {
    var p_eResolve = function p_eResolve() {};

    var p_e = new Promise(function (resolve) {
      p_eResolve = resolve;
    });
    var p_off = new Promise(function (resolve) {
      return resolve();
    });
    var res = f(mkEventJS(function (pushSelf) {
      p_off = p_e.then(function (event) {
        return consumeJS(pushSelf)(event);
      });
      return function () {
        p_off.then(function (off) {
          return off();
        });
        p_off = new Promise(function (resolve) {
          return resolve();
        });
      };
    }));
    p_eResolve(e_fromRes(res));
    return res;
  };
}; // -- timer :: Int -> Event Int


var timer = function timer(ms) {
  return mkEventJS(function (pushSelf) {
    var count = 1;
    var id = setInterval(function () {
      pushSelf(count);
      count++;
    }, ms);
    return function () {
      return clearInterval(id);
    };
  });
}; // -- debounce :: forall a. Int -> Event a -> Event a


var debounce = function debounce(ms) {
  return function (event) {
    var timeoutId;
    return mkEventJS(function (pushSelf) {
      var off = consumeJS(function (v) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(function () {
          return pushSelf(v);
        }, ms);
      })(event);
      return function () {
        off();

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };
    });
  };
}; // -- throttle :: forall a. Int -> Event a -> Event a


var throttle = function throttle(ms) {
  return function (event) {
    var timeoutId;
    var latest;
    return mkEventJS(function (pushSelf) {
      var off = consumeJS(function (v) {
        latest = v;

        if (!timeoutId) {
          timeoutId = setTimeout(function () {
            timeoutId = null;
            return pushSelf(latest);
          }, ms);
        }
      })(event);
      return function () {
        off();

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };
    });
  };
};

var deferOff = function deferOff(ms) {
  return function (event) {
    var softOn = false;
    var isOn = false;

    var offFn = function offFn() {};

    return mkEventJS(function (pushSelf) {
      softOn = true;

      if (!isOn) {
        offFn = consumeJS(pushSelf)(event);
        isOn = true;
      }

      return function () {
        softOn = false;
        setTimeout(function () {
          if (softOn) {
            return;
          }

          isOn = false;
          offFn();

          offFn = function offFn() {};
        }, ms);
      };
    });
  };
}; // -- tagWith :: forall a b c. (a -> b -> c) -> Event a -> Event b -> c -> Event c


var tagWith = function tagWith(f) {
  return function (tagged) {
    return function (tagger) {
      var taggerVal;
      var hasTaggerVal = false;
      return mkEventJS(function (pushSelf) {
        var off1 = consumeJS(function (tv) {
          taggerVal = tv;
          hasTaggerVal = true;
        })(tagger);
        var off2 = consumeJS(function (taggedVal) {
          if (!hasTaggerVal) {
            return;
          }

          pushSelf(f(taggedVal)(taggerVal));
        })(tagged);
        return function () {
          off1();
          off2();
        };
      });
    };
  };
}; ///////////////////////////////////////////


var nextSigBuilderId = 1;
var sigBuilders = {};

var mkSigBuilder = function mkSigBuilder() {
  return {
    destroys: []
  };
}; // -- s_destroy :: forall a. Signal a -> Effect Unit


var s_destroy = function s_destroy(s) {
  return function () {
    return s.destroy();
  };
}; // -- s_subRes :: forall a. SubRes a -> a


var s_subRes = function s_subRes(_ref) {
  var res = _ref.res;
  return res;
}; // -- s_unsub :: forall a. SubRes a -> Effect Unit


var s_unsub = function s_unsub(_ref2) {
  var off = _ref2.off;
  return function () {
    return off();
  };
}; // -- s_sub :: forall a b. (a -> Effect b) -> Signal a -> Effect (SubRes b)


var s_sub = function s_sub(f) {
  return function (s) {
    return function () {
      return s.sub(function (val) {
        return f(val)();
      });
    };
  };
}; // -- s_inst :: forall a. Signal a -> Effect a


var s_inst = function s_inst(s) {
  return function () {
    return s.getVal();
  };
}; // -- s_changed :: forall a. Signal a -> Event.Event a


var s_changed = function s_changed(_ref3) {
  var changed = _ref3.changed;
  return changed;
}; // -- s_tagWith :: forall a b c. (a -> b -> c) -> Event.Event a -> Signal b -> Event.Event c


var s_tagWith = function s_tagWith(f) {
  return function (e) {
    return function (s) {
      return fmap(function (a) {
        return f(a)(s.getVal());
      })(e);
    };
  };
}; // -- s_fromImpl :: forall a. Event.Event a -> a -> SigClass -> Signal a


var sigOns = 0;
var sigOffs = 0;

var s_fromImpl = function s_fromImpl(changed) {
  return function (init) {
    return function (id) {
      var subs = {};
      var nextSubId = 1;
      var isDestroyed = false;
      var val = init;
      sigOns++; // console.log({ sigOns, sigOffs });

      var off = consumeJS(function (curr) {
        if (isDestroyed) {
          return;
        }

        val = curr;
        Object.values(subs).forEach(function (handler) {
          return handler(val);
        });
      })(changed);

      var getVal = function getVal() {
        return val;
      };

      var sub = function sub(f) {
        if (isDestroyed) {
          return f(val);
        }

        var subId = nextSubId;
        nextSubId++;
        subs[subId] = f;
        var res = f(val);

        var off = function off() {
          delete subs[subId];
        };

        return {
          res: res,
          off: off
        };
      };

      var destroy = function destroy() {
        sigOffs++; // console.log({ sigOffs, sigOns });

        off();
        subs = {};
        isDestroyed = true;
      };

      var sigBuilder = sigBuilders[id];
      sigBuilder.destroys.push(destroy);
      return {
        destroy: destroy,
        getVal: getVal,
        changed: changed,
        sub: sub
      };
    };
  };
}; // -- s_fmapImpl :: forall a b. (a -> b) -> Signal a -> SigClass -> Signal b


var s_fmapImpl = function s_fmapImpl(f) {
  return function (s) {
    return s_fromImpl(fmap(f)(s.changed))(f(s.getVal()));
  };
}; // -- s_constImpl :: forall a. a -> SigClass -> Signal a


var s_constImpl = function s_constImpl(v) {
  return s_fromImpl(never)(v);
}; // -- s_zipWithImpl :: forall a b c. (a -> b -> c) -> Signal a -> Signal b -> SigClass -> Signal c


var s_zipWithImpl = function s_zipWithImpl(f) {
  return function (s1) {
    return function (s2) {
      return s_fromImpl(fmap(function () {
        return f(s1.getVal())(s2.getVal());
      })(join([s1.changed, s2.changed])))(f(s1.getVal())(s2.getVal()));
    };
  };
}; // -- s_flattenImpl :: forall a. Signal (Signal a) -> SigClass -> Signal a


var s_flattenImpl = function s_flattenImpl(ss) {
  return s_fromImpl(join([flatMap(function (_ref4) {
    var changed = _ref4.changed;
    return changed;
  })(ss.changed), fmap(function (_ref5) {
    var getVal = _ref5.getVal;
    return getVal();
  }, ss.changed), ss.getVal().changed]))(ss.getVal().getVal());
}; // -- s_dedupImpl :: forall a. (a -> a -> Boolean) -> Signal a -> SigClass -> Signal a


var s_dedupImpl = function s_dedupImpl(eq) {
  return function (s) {
    return function (id) {
      var prev;
      var isFirst = true;
      return s_fromImpl(filter(function (val) {
        if (isFirst) {
          isFirst = false;
          prev = val;
          return true;
        }

        if (val == prev || eq(val)(prev)) {
          return false;
        }

        prev = val;
        return true;
      })(s.changed))(s.getVal())(id);
    };
  };
}; // -- s_buildImpl :: forall a. (SigClass -> Signal a) -> SigBuild a


var s_buildImpl = function s_buildImpl(f) {
  return function () {
    var sigBuilderId = nextSigBuilderId;
    nextSigBuilderId++;
    sigBuilders[sigBuilderId] = mkSigBuilder();
    var signal = f(sigBuilderId);
    var sigBuilder = sigBuilders[sigBuilderId];
    var destroys = sigBuilder.destroys;

    var destroy = function destroy() {
      return destroys.forEach(function (destroy) {
        return destroy();
      });
    };

    delete sigBuilders[sigBuilderId];
    return {
      destroy: destroy,
      signal: signal
    };
  };
}; // -- sigBuildToRecordImpl ::
//      forall a.
//      (Effect Unit -> Signal a -> { destroy :: Effect Unit, signal :: Signal a }) ->
//      SigBuild a ->
//      Effect { destroy :: Effect Unit, signal :: Signal a }


var sigBuildToRecordImpl = function sigBuildToRecordImpl(toRecord) {
  return function (sbf) {
    return function () {
      var _sbf = sbf(),
          destroy = _sbf.destroy,
          signal = _sbf.signal;

      return toRecord(destroy)(signal);
    };
  };
}; ///////////////////////////////////////////


exports.impl = {
  mkEventJS: mkEventJS,
  mkEvent: mkEvent,
  pushJS: pushJS,
  push: push,
  consumeJS: consumeJS,
  consume: consume,
  rebuildBy: rebuildBy,
  fmap: fmap,
  filter: filter,
  reduce: reduce,
  flatMap: flatMap,
  join: join,
  dedupImpl: dedupImpl,
  preempt: preempt,
  never: never,
  tagWith: tagWith,
  timer: timer,
  debounce: debounce,
  throttle: throttle,
  deferOff: deferOff,
  s_destroy: s_destroy,
  s_subRes: s_subRes,
  s_unsub: s_unsub,
  s_sub: s_sub,
  s_inst: s_inst,
  s_changed: s_changed,
  s_tagWith: s_tagWith,
  s_fromImpl: s_fromImpl,
  s_fmapImpl: s_fmapImpl,
  s_constImpl: s_constImpl,
  s_zipWithImpl: s_zipWithImpl,
  s_flattenImpl: s_flattenImpl,
  s_dedupImpl: s_dedupImpl,
  s_buildImpl: s_buildImpl,
  sigBuildToRecordImpl: sigBuildToRecordImpl
};
},{}],"../node_modules/gen-computation/index.js":[function(require,module,exports) {
const _ask = { type: 'ask' };
const ask = () => (function* () {
    return yield _ask;
})();

const _tell = (value) => ({ type: 'tell', value });
const tell = (value) => (function* (){
    return yield _tell(value);
})();

const _get = { type: 'get' };
const get = () => (function* () {
    return yield _get;
})();

const _put = (state) => ({ type: 'put', state });
const put = (state) => (function* (){
    return yield _put(state);
})();

const _fail = (error) => ({ type: 'fail', error });
const fail = (error) => (function* (){
    return yield _fail(error);
})();

const asks = f => (function* () {
    return f(yield* ask());
})();

const gets = f => (function* () {
  return f(yield* get());
})();

const modify = f => (function* () {
    const curr = yield* get();
    return yield* put(f(curr));
})();

const exec = (env, initialState) => (comp) => {
    let state = initialState;
    let mval;
    const writer = [];
    while (true) {
        const result = comp.next(mval);
        if (result.done) {
            return {
                success: true,
                result: result.value,
                state,
                writer
            };
        }
        switch (result.value.type) {
            case 'ask':
                mval = env;
                break;
            case 'tell':
                writer.push(result.value.value);
                mval = undefined;
                break;
            case 'get':
                mval = state;
                break;
            case 'put':
                state = result.value.state;
                mval = undefined;
                break;
            case 'fail':
                return {
                    success: false,
                    error: result.value.error,
                    state,
                    writer
                };
        }
    }
};

exports.ask = ask;
exports.tell = tell;
exports.get = get;
exports.put = put;
exports.fail = fail;
exports.asks = asks;
exports.gets = gets;
exports.modify = modify;
exports.exec = exec;

},{}],"../FRP.js":[function(require,module,exports) {
var _require = require('./raw_src/FRP'),
    impl = _require.impl;

var _require2 = require('gen-computation'),
    ask = _require2.ask,
    exec = _require2.exec;

exports.mkEvent = impl.mkEventJS;

exports.push = function (v, e) {
  return impl.pushJS(v)(e);
};

exports.consume = function (f, e) {
  return impl.consumeJS(f)(e);
};

exports.rebuildBy = function (toNexts, e) {
  return impl.rebuildBy(toNexts)(e);
};

exports.fmap = function (f, e) {
  return impl.fmap(f)(e);
};

exports.filter = function (p, e) {
  return impl.filter(p)(e);
};

exports.reduce = function (r, i, e) {
  return impl.reduce(r)(i)(e);
};

exports.flatMap = function (toEvent, e) {
  return impl.flatMap(toEvent)(e);
};

exports.join = impl.join;

exports.dedup = function (e) {
  var eq = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (a, b) {
    return a == b;
  };
  return impl.dedupImpl(eq)(e);
};

exports.preempt = function (e_fromRes, f) {
  return impl.preempt(e_fromRes)(f);
};

exports.never = impl.never;

exports.tagWith = function (f, tagged, tagger) {
  return impl.tagWith(f, tagged, tagger);
};

exports.timer = impl.timer;

exports.debounce = function (ms, e) {
  return impl.debounce(ms)(e);
};

exports.throttle = function (ms, e) {
  return impl.throttle(ms)(e);
};

exports.deferOff = function (ms, e) {
  return impl.deferOff(ms)(e);
};

exports.s_destroy = function (s) {
  return impl.s_destroy(s)();
};

exports.s_subRes = impl.s_subRes;

exports.s_unsub = function (arg) {
  return impl.s_unsub(arg)();
};

exports.s_sub = function (f, s) {
  return impl.s_sub(function (v) {
    return function () {
      return f(v);
    };
  })(s)();
};

exports.s_inst = function (s) {
  return impl.s_inst(s)();
};

exports.s_changed = impl.s_changed;

exports.s_tagWith = function (f, e, s) {
  return impl.s_tagWith(f)(e)(s);
};

exports.s_from = function (changed, init) {
  return /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var sigClass;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            return _context.delegateYield(ask(), "t0", 1);

          case 1:
            sigClass = _context.t0;
            return _context.abrupt("return", impl.s_fromImpl(changed)(init)(sigClass));

          case 3:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  })();
};

exports.s_fmap = function (f, s) {
  return /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
    var sigClass;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            return _context2.delegateYield(ask(), "t0", 1);

          case 1:
            sigClass = _context2.t0;
            return _context2.abrupt("return", impl.s_fmapImpl(f)(s)(sigClass));

          case 3:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  });
};

exports.s_const = function (v) {
  return /*#__PURE__*/regeneratorRuntime.mark(function _callee3() {
    var sigClass;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            return _context3.delegateYield(ask(), "t0", 1);

          case 1:
            sigClass = _context3.t0;
            return _context3.abrupt("return", impl.s_constImpl(v)(sigClass));

          case 3:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  });
};

exports.s_zipWith = function (f, s1, s2) {
  return /*#__PURE__*/regeneratorRuntime.mark(function _callee4() {
    var sigClass;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            return _context4.delegateYield(ask(), "t0", 1);

          case 1:
            sigClass = _context4.t0;
            return _context4.abrupt("return", impl.s_zipWithImpl(f)(s1)(s2)(sigClass));

          case 3:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  });
};

exports.s_flatten = function (ss) {
  return /*#__PURE__*/regeneratorRuntime.mark(function _callee5() {
    var sigClass;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            return _context5.delegateYield(ask(), "t0", 1);

          case 1:
            sigClass = _context5.t0;
            return _context5.abrupt("return", impl.s_flattenImpl(ss)(sigClass));

          case 3:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5);
  });
};

exports.s_dedup = function (s) {
  var eq = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (a, b) {
    return a == b;
  };
  return /*#__PURE__*/regeneratorRuntime.mark(function _callee6() {
    var sigClass;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            return _context6.delegateYield(ask(), "t0", 1);

          case 1:
            sigClass = _context6.t0;
            return _context6.abrupt("return", impl.s_dedupImpl(eq)(s)(sigClass));

          case 3:
          case "end":
            return _context6.stop();
        }
      }
    }, _callee6);
  });
};

exports.s_build = function (builder) {
  var fromSigClass = function fromSigClass(sigClass) {
    return exec(sigClass)(builder).result;
  };

  return impl.s_buildImpl(fromSigClass)();
};
},{"./raw_src/FRP":"../raw_src/FRP.js","gen-computation":"../node_modules/gen-computation/index.js"}],"index.js":[function(require,module,exports) {
var frp = require('../FRP');

var e = frp.mkEvent();
var off = frp.consume(function (a) {
  return console.log({
    a: a
  });
}, e);
frp.push(1, e);
frp.push(2, e);
frp.push(3, e);
off();
frp.push(4, e);
var e_t1 = frp.timer(1000);
var e_t2 = frp.timer(500);

var _frp$s_build = frp.s_build( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
  var s1, s2;
  return regeneratorRuntime.wrap(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          return _context.delegateYield(frp.s_from(e_t1, 0), "t0", 1);

        case 1:
          s1 = _context.t0;
          return _context.delegateYield(frp.s_from(e_t2, 0), "t1", 3);

        case 3:
          s2 = _context.t1;
          return _context.delegateYield(frp.s_zipWith(function (a, b) {
            return {
              a: a,
              b: b
            };
          }, s1, s2), "t2", 5);

        case 5:
          return _context.abrupt("return", _context.t2);

        case 6:
        case "end":
          return _context.stop();
      }
    }
  }, _callee);
})()),
    signal = _frp$s_build.signal,
    destroy = _frp$s_build.destroy;

frp.s_sub(function (a) {
  return console.log(a);
}, signal);
window.setTimeout(destroy, 30000);
},{"../FRP":"../FRP.js"}],"../../../../../usr/lib/node_modules/parcel/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "43601" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../../../../../usr/lib/node_modules/parcel/src/builtins/hmr-runtime.js","index.js"], null)
//# sourceMappingURL=/test.e31bb0bc.js.map