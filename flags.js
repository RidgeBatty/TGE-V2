/**
 * Flags register
 */

class Flags {
    /**
     * 
     * @param {[string]} flagNames 
     */
    constructor(flagNames) {
        this.register = {};

        let  val = 1;
        for (const k of flagNames) this.register[k] = val *= 2;
    }

    set value(b) {
        this.register
    }

}