class Events {
    /**
     * Provide a list of event handler names upon construction. It can be either a space separated string OR an object
     * @param {*} o 
     */
    #list = {};
    #id = 0;
    constructor(owner, o = {}) {
        if (typeof o == 'string') var o = o.split(' ');
        for (const e of o) this.#list[e] = [];

        this.isActive = true;
        this.owner = owner;
        this._stopPropagation = '';
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
            this.#list[evt] = [];
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
                const eObj = { isActive:handlerOrIsActive, handler:v, id:this.#id++ };
                this.#list[k].push(eObj);
            }
            return;
        }

        if (AE.isFunction(o) && handler == null) {                                                                  // o = function
            if (handlerOrIsActive == null) handlerOrIsActive = true;
            return this.#list[o.name].push({ isActive:handlerOrIsActive, handler:o, id:this.#id++ }); 
        }
        
        const e = this.#list[o];                                                                                    // o = string                
        if (e) { 
            const id = this.#id++; 
            e.push({ isActive:true, handler:handlerOrIsActive, id }); 
            return id; 
        }
            else throw 'Handler named "' + o + '" not found';
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
        if (e) for (let i = e.length; i--;) if (e[i].handler == handler) e.splice(i, 1);        
    }

    removeById(id) {
        if (!Array.isArray(id)) var id = [id];

        for (const _id of id) {                                                             // check for all requested id's
            for (const e of Object.values(this.#list)) {                                    // check for all event types (mouseup, keydown, etc...)
                for (let i = e.length; i--;) if (e[i].id == _id) e.splice(i, 1);            // check for all installed handlers
            }
        }
    }

    fire(name, args) {
        if (!this.isActive) return;
        const e = this.#list[name];        
        if (!e) return;
        const o = Object.assign({ instigator:this.owner, name }, args);
        for (const evt of e) {
            if (evt.isActive && name != this._stopPropagation) evt.handler(o);
        }
        this._stopPropagation = '';
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

    getEventsByName(eventName) {
        const events = Object.entries(this.#list);
        for (const evt of events) {            
            if (evt[0] == eventName) return evt[1];
        }
        return null;
    }

    stopPropagation(eventName) {
        this._stopPropagation = eventName;
    }
}

export { Events }