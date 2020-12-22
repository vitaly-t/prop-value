import {IPathResult, PathErrorCode} from './types';

/**
 * Path-to-descriptor core resolution function.
 *
 * @param target
 * Default scope to resolve against.
 *
 * @param path
 * Resolution path, either as an array of property names, or a dot-separated string.
 * If the path starts with `this`, resolution is against the calling context.
 */
export function resolvePath(this: any, target: any, path: string | string[]): IPathResult {
    const chain = Array.isArray(path) ? path : path.indexOf('.') === -1 ? [path] : path.split('.');
    const len = chain.length;
    let value, isThis, i = 0, exists = true;
    for (i; i < len; i++) {
        const name = chain[i];
        if (!name) {
            return {chain, idx: i - 1, errorCode: PathErrorCode.emptyName};
        }
        isThis = name === 'this';
        if (isThis) {
            if (i) {
                return {chain, idx: i - 1, errorCode: PathErrorCode.invalidThis};
            }
            target = this;
        }
        if (target === null || target === undefined) {
            if (isThis) {
                value = target;
                i++;
            }
            break;
        }
        const v = isThis ? target : target[name];
        value = typeof v === 'function' ? v.call(target) : v;
        if (value === undefined || value === null) {
            i++;
            if (value === undefined && i === len) {
                const obj = typeof target === 'object' ? target : target.constructor.prototype;
                exists = name in obj;
            }
            break;
        }
        if (typeof value.then === 'function') {
            return {chain, idx: i - 1, errorCode: PathErrorCode.asyncValue};
        }
        if (typeof value.next === 'function') {
            return {chain, idx: i - 1, errorCode: PathErrorCode.genValue};
        }
        target = value;
    }
    if (i === len) {
        return {chain, idx: i - 1, exists, value};
    }
    return {chain, idx: i - 1, errorCode: PathErrorCode.stopped};
}
