export default function asyncProcess(functions, { isCancelled, toState, fromState, additionalArgs }, callback) {
    let remainingFunctions = Array.isArray(functions) ? functions : Object.keys(functions);

    const isState = obj => typeof obj === 'object' && obj.name !== undefined && obj.params !== undefined && obj.path !== undefined;
    const hasStateChanged = state => state.name !== toState.name || state.params !== toState.params || state.path !== toState.path;

    const processFn = (done) => {
        if (!remainingFunctions.length) return true;

        const isMapped = typeof remainingFunctions[0] === 'string';
        const errVal = isMapped ? remainingFunctions[0] : {};
        let stepFn  = isMapped ? functions[remainingFunctions[0]] : remainingFunctions[0];

        // const len = stepFn.length;
        const res = stepFn.apply(null, additionalArgs.concat([toState, fromState, done]));

        if (isCancelled()) {
            done(null);
        } else if (typeof res === 'boolean') {
            done(res ? null : errVal);
        } else if (res && typeof res.then === 'function') {
            res.then(resVal => done(null, resVal), (err) => {
                if (err instanceof Error) {
                    console.error(err.stack || err);
                }
                done(errVal);
            });
        }
        // else: wait for done to be called

        return false;
    };

    const iterate = (err, val) => {
        if (err) callback(err);
        else {
            if (val && isState(val)) {
                if (hasStateChanged(val)) console.error('[router5][transition] State values changed during transition process and ignored.');
                else toState = val;
            }
            remainingFunctions = remainingFunctions.slice(1);
            next();
        }
    };

    const next = () => {
        if (isCancelled()) {
            callback(null);
        } else {
            const finished = processFn(iterate);
            if (finished) callback(null, toState);
        }
    };

    next();
}
