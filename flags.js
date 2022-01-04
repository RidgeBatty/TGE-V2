/**
 * 
 * Implementation of a simple flags register
 * 
 */
class Flags {
    /**
     * 
     * @param {[string]} flagNames 
     */
    constructor(flagNames) {
        this.register = {};
        this._value   = 0;          // all off

        let  val = 0;
        for (const name of flagNames) this.register[name] = val++;
    }

    setFlag(name, value) {
        if (!(name in this.register)) throw `Flag register does not contain key name "${name}".`;
        
        if (value) this._value |= (1 << this.register[name]);
            else this._value &= ~(1 << this.register[name]);        
    }

    setFlags(o) {
        for (const [k, v] of Object.entries(o)) this.setFlag(k, v);
    }

    getFlag(name) {
        if (!(name in this.register)) throw `Flag register does not contain key name "${name}".`;
        return (this._value & (1 << this.register[name])) != 0;
    }

    asObject() {
        const o = {};
        for (const name of Object.keys(this.register)) o[name] = this.getFlag(name);
        return o;
    }

    asJSON() {
        return JSON.stringify(this.asObject(), null, '\t');
    }

    static async FromJSON(data) {
        return new Promise((resolve, reject) => {
            try {
                const o = JSON.parse(data);        
                resolve(Flags.FromObject(o));
            } catch(e) {
                reject(e);
            }
        });        
    }

    static FromObject(o) {
        const k = Object.keys(o);
        const f = new Flags(k);
        for (const i of k) f.setFlag(i, o[i]);        
        return f;
    }
}

export { Flags } 