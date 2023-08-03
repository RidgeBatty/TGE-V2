import { sealProp } from "./utils.js";

class EventBroadcaster {
    /**
     * 
     * @param {[string]} eventNames Array of event names
     * @param {*} o Descendant class parameters object, which may or may not contain events which should be installed upon class construction. The event handlers are identified by 'on' prefix.
     */
    constructor(eventNames, o) {
        // create sealed, private object "_events" for event handler arrays
		const events = {};
		for (const e of eventNames) events[e] = [];
		sealProp(this, '_events', events);

        if (o) this.installFromParams(o);
    }

    installFromParams(o) {
        for (const name of Object.keys(this._events)) if (o['on' + name] !== undefined) this.addEvent(name.toLowerCase(), o['on' + name]);		
    }

    addEvent(name, func) {
		if (typeof func != 'function') throw 'Second parameter must be a function';
		if (name in this._events) this._events[name].push({ name, func });		
	}
	
	_fireEvent(name, data) {
		const e = this._events[name];													
		if (e) for (var i = 0; i < e.length; i++) e[i].func(Object.assign({ eventName:name, instigator:this }, data));
	}
}

export { EventBroadcaster }