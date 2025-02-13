import {IPathOptions, IPathResult, PathErrorCode, PathInput} from './types';
import {isClass} from './utils';

/**
 * Path-to-descriptor core resolution function.
 *
 * @param target
 * Default resolution scope.
 *
 * @param path
 * Resolution path, either as an array of property names, or a dot-separated string.
 * If the path starts with `this`, resolution is against the calling context.
 *
 * @param options
 * Path-parsing options.
 */
export function resolvePath(this: any, target: any, path: PathInput, options?: IPathOptions): IPathResult {
    const chain = typeof path === 'string' ? path.indexOf('.') === -1 ? [path] : path.split('.') : path;
    const len = chain.length, ignoreFunctions = options && options.ignoreFunctions,
        ownProperties = options && options.ownProperties;
    let value, isThis, i = 0, exists = true, scope = target;
    for (i; i < len; i++) {
        const name = chain[i];
        if (name === '') {
            return {chain, scope, options, idx: i - 1, errorCode: PathErrorCode.emptyName};
        }
        isThis = name === 'this';
        if (isThis) {
            if (i) {
                return {chain, scope, options, idx: i - 1, errorCode: PathErrorCode.invalidThis};
            }
            target = scope = this;
        }
        if (target === null || target === undefined) {
            if (isThis) {
                value = target;
                i++;
            }
            break;
        }
        let isOwnProperty = true;
        if(Array.isArray(target)) {
            value = target.at(Number(name));
        } else {
            value = isThis ? target : !ownProperties || (isOwnProperty = target?.hasOwnProperty(name)) ? target[name] : undefined;
        }
        while (!ignoreFunctions && typeof value === 'function' && !isClass(value)) {
            value = value.call(target);
        }
        if (value === undefined || value === null) {
            i++;
            if (value === undefined && i === len) {
                const obj = typeof target === 'object' ? target : target.constructor.prototype;
                exists = !ownProperties ? name in obj : isOwnProperty;
            }
            break;
        }
        if (typeof value.then === 'function') {
            return {chain, scope, options, idx: i - 1, errorCode: PathErrorCode.asyncValue};
        }
        if (typeof value.next === 'function') {
            return {chain, scope, options, idx: i - 1, errorCode: PathErrorCode.genValue};
        }
        target = value;
    }
    if (i === len) {
        return {chain, scope, options, idx: i - 1, exists, value};
    }
    return {chain, scope, options, idx: i - 1, errorCode: PathErrorCode.stopped};
}

/**
 * Converts a valid full-syntax JavaScript string into an array of names/indexes,
 * which then can be passed into `resolvePath`.
 *
 * This function is separate from `resolvePath` for performance reasons, as tokenizing
 * a path is much slower than resolving a tokenized path. Therefore, when possible, it is
 * best to tokenize a path only once, and then reuse the tokens to resolve the path value.
 *
 * @param path
 * Valid JavaScript property path.
 */
export function tokenizePath(path: string): string[] {
    const res = [], reg = /\[\s*([-]*\d+)(?=\s*])|\[\s*(["'])((?:\\.|(?!\2).)*)\2\s*]|[-\w$]+/g;
    let a;
    while (a = reg.exec(path)) {
        res.push(a[1] || a[3] || a[0]);
    }
    return res;
}
