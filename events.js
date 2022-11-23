
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
     * @param {function|isActive} handlerOrIsActive Handler function OR if the "o" parameter was an object or function, this becomes the isActive flag.
     * @returns 
     */
    add(o, handlerOrIsActive) {        
        if (typeof o == 'object') {                                                                                 // o = object  
            if (handlerOrIsActive == null) handlerOrIsActive = true;
            for (const [k, v] of Object.entries(o)) {
                if (!this.#list[k]) throw 'Handler named "' + k + '" not found';
                const eObj = { isActive:handlerOrIsActive, handler:v };
                this.#list[k].push(eObj);
            }
            return;
        }

        if (AE.isFunction(o) && handler == null) {                                                                  // o = function
            if (handlerOrIsActive == null) handlerOrIsActive = true;
            return this.#list[o.name].push({ isActive:handlerOrIsActive, handler:o }); 
        }
        
        const e = this.#list[o];                                                                                    // o = string
        if (e) e.push({ isActive:true, handler:handlerOrIsActive });
    }

    register(dispatcher, o, isActive = true) {        
        if (typeof o == 'object') {                                 
            for (const [k, v] of Object.entries(o)) {
                if (!this.#list[k]) throw 'Handler named "' + k + '" not found';
                const eObj = { dispatcher, isActive, handler:v };
                this.#list[k].push(eObj);                
            }         
        }
    }

    unregister(dispatcher) {
        const events = Object.entries(this.#list);
        let removedHandlers = 0;
        for (const evt of events) {
            const f = evt[1].findIndex(e => e.dispatcher == dispatcher);
            if (f > -1) {
                evt[1].splice(f, 1);                       
                removedHandlers++;
            }
        }        
        return removedHandlers;
    }

    remove(name, handler) {        
        const e = this.#list[name];
        if (e) for (let i = e.length; i--;) if (e[i] == handler) e.splice(i, 1);        
    }

    fire(name, args) {
        const e = this.#list[name];        
        if (!e) return;

        const o = Object.assign({ instigator:this.owner, name }, args);
        for (const evt of e) if (evt.isActive) evt.handler(o);        
    }

    findByHandler(handler) {
        const events = Object.entries(this.#list);
        for (const evt of events) {
            const f = evt[1].find(e => e.handler == handler);
            if (f) return { name:evt[0], event:f };
        }
        return null;
    }

    findByDispatcher(dispatcher) {
        const events = Object.entries(this.#list);
        for (const evt of events) {
            const f = evt[1].find(e => e.dispatcher == dispatcher);
            if (f) return { name:evt[0], event:f };
        }
        return null;
    }

    enable(dispatcher) {        
        const events = Object.entries(this.#list);
        for (const evt of events) {
            const f = evt[1].find(e => e.dispatcher == dispatcher);
            if (f) f.isActive = true;
        }
    }

    disable(dispatcher) {
        const events = Object.entries(this.#list);
        for (const evt of events) {
            const f = evt[1].find(e => e.dispatcher == dispatcher);
            if (f) f.isActive = false;
        }
    }
}

export { Events }