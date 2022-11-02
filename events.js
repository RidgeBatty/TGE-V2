
class Events {
    /**
     * Provide a list of event handler names upon construction. It can be either a space separated string OR an object
     * @param {*} o 
     */
    #list = {};
    constructor(owner, o = {}) {
        if (typeof o == 'string') var o = o.split(' ');
        for (const e of o) this.#list[e] = [];

        this.owner = owner;
    }

    get names() {
        return Object.keys(this.#list);
    }

    /**
     * Creates a new event type
     * @param {string} e Name (or several names, space separated) of the event type
     */
    create(e) {
        const list = e.split(' ');
        for (const evt of list) {
            if (this.#list[evt]) throw 'Event handler "' + evt + '" already exists';
            this.#list[e] = [];
        }        
    }

    /**
     * 
     * @param {object|function|string} o This value can be either an object containing "eventName:function" pairs OR a function (the eventName being the same as the function name) OR a string (eventName) when the second parameter must be present
     * @param {function=} handler 
     * @returns 
     */
    add(o, handler) {        
        if (typeof o == 'object') {            
            for (const [k, v] of Object.entries(o)) {
                if (!this.#list[k]) throw 'Handler named "' + k + '" not found';
                this.#list[k].push(v);
            }
            return;
        }

        if (AE.isFunction(o) && handler == null) return this.#list[o.name].push(o);  
        const e = this.#list[o];
        if (e) e.push(handler);
    }

    remove(name, handler) {        
        const e = this.list[name];
        if (e) for (let i = e.length; i--;) if (e[i] == handler) e.splice(i, 1);        
    }

    fire(name, args) {
        const e = this.#list[name];        
        if (!e) return;

        const o = Object.assign({ instigator:this.owner }, args);
        for (const evt of e) evt(o);        
    }
}

export { Events }