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
