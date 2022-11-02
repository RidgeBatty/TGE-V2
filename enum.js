
class Enum {
    constructor(options) {
        this.items     = {};
        this._numValue = 0;

        if (typeof options == 'string') {
            let i = 1;
            for (let s of options.split(' ')) this.items[s] = i++;
            this._numValue = 1;
            Object.freeze(this.items);
        }
    }

    get value() {
        return this._numValue;
    }

    get string() {
        const f = Object.entries(this.items).find(i => i[1] == this._numValue);        
        return f ? f[0] : null;
    }

    set string(v) {        
        if (this.items[v]) this._numValue = this.items[v];
    }
}

export { Enum }