/**
 * 
 * Flags register in TGE
 * 
 */

import { isFunction, isObject } from "./utils.js";

export class Flags {        
    /**
     * Creates a new Flags register instance
     * @param {object} defaults Initial values for the flags register as a dictionary object (key/value pairs).
     * @param {object} [options] A dictionary object containing the flags register create parameters.
     * @param {boolean} options.isExtensible Creates an extensible flags register. More flags may be added after construction. Defaults to false.
     * @param {boolean} options.isProxied Creates a proxied flags register. Allows read/write interception of individual flags. Defaults to true.
     * @param {function} [onSetFlag] Callback function which is fired every time any flag is modified.
     * @returns {Flags}
     */
    static Create(defaults, options = {}, onSetFlag) {                            
        if (onSetFlag && !isFunction(onSetFlag)) throw new Error(`FlagError: Failed to create flags. Callback "onSetFlag" was provided but its not a function.`);
        
        const handler = {
            get(o, prop) { 
                if (o[prop] === undefined) throw new Error(`FlagError: Reading flag "${prop}". Key does not exist.`);
                return o[prop];
            },
            set(o, prop, value) {                   
                if (onSetFlag) {
                    const noDefaultHandling = onSetFlag(prop, value);
                    if (noDefaultHandling) return true;
                }
                o[prop] = value;
                return true;
            },
        }    
        
        var options = Object.assign({ isExtensible : false, isProxied : true }, options);
        let f = Object.assign({}, defaults);
        if (!options.isExtensible) f = Object.seal(f);
        if (options.isProxied)     f = new Proxy(f, handler);
        return f;
    }

    /**
     * Sets flags (or a subset) by copying them from an given "source" object. The object's keys must match with the flag register's keys. New flags cannot be created using this function.
     * @param {Flags} target Flags instance which will be modified.
     * @param {Flags|object} source Flags instance or a dictionary object which contains the flags you want to modify. Values are coerced into Booleans.
     */
    static Set(target, source) {
        if (!isObject(target) || !isObject(source)) throw new Error(`FlagError: Failed to set flags. Both arguments must be objects.`);
        Object.entries(source).forEach(([k, v]) => { if (target[k] !== undefined) target[k] = Boolean(v); });
    }

    /**
     * Copies flags from an given "source" object. If a flag does not exists in target, the function will attempt to create it.
     * @param {Flags} target Flags instance which will be modified.
     * @param {Flags|object} source Flags instance or a dictionary object which contains the flags you want to copy. Values are coerced into Booleans.
     */
    static Copy(target, source) {
        if (!isObject(target) || !isObject(source)) throw new Error(`FlagError: Failed to set flags. Both arguments must be objects.`);
        Object.entries(source).forEach(([k, v]) => target[k] = Boolean(v));
    }
}
