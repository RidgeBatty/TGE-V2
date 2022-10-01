/**
 * 
 * Implementation of a simple flags register
 * 
 */
class Flags {
    /**
     * 
     * @param {object} flags 
     * @param {name=value} flags.name 
     */
    constructor(flags = {}, onFlagChange) {
        this.register = {};
        this._value   = 0;          // all off
        this.onFlagChange = [];

        if (onFlagChange) this.onFlagChange.push(onFlagChange);
        
        let v = 0;
        for (const [name, value] of Object.entries(flags)) { 
            this.register[name] = v++;           
            this.setFlag(name, value);
        }
    }

    setFlag(name, value = true) {
        if (!(name in this.register)) throw `Flag register does not contain key name "${name}".`;
        
        if (value) this._value |= (1 << this.register[name]);
            else this._value &= ~(1 << this.register[name]);        

        for (const f of this.onFlagChange) f(name, value);
    }

    some(o) {
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