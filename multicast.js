/*

	Module MultiCast
	Tiny Game Engine
	Written by Ridge Batty (c) 2020

	Install one Window level event handler of each type and redirect events to user installed handler functions.

*/
const handlers = {
	'contextmenu' : [],
	'mouseover'   : [],
	'mouseout'    : [],
	'mousedown'   : [],
	'mousemove'   : [],
	'mouseup'     : [],
	'click'       : [],
	'wheel'       : [],
	'dblclick'    : [],
	'keydown'     : [],
	'keyup'       : [],
	'resize'      : [],
}
const MouseEvts = 'contextmenu mouseover mouseout mousedown mousemove mouseup click dblclick'.split(' ');

function broadcast(o) {
	for (let i = 0; i < handlers[o.name].length; i++) {		
		const h = handlers[o.name][i];
		
		let preventBubbling;
		if (h.isActorEvent) {
			if (h.actor != null && h.actor.elem == o.event.target) preventBubbling = h.func(o.event, { name:o.name, data:h.data, actor:h.actor });
		} else 
			preventBubbling = h.func(o.event, { name:o.name, data:h.data });
			
		if (preventBubbling == false) break;	
	}
}

function installHandlers() {	
	console.log('Installing event handlers...');
	for (let name in handlers) {	
		AE.addEvent(window, name, (e) => broadcast({ event:e, name }) );	
	}
}

function addEvent(evtName, func, data) {
	if (evtName != null && evtName in handlers) handlers[evtName].push({ func, data, isActorEvent:false });	
}

function addEventToActor(evtName, func, data, actor) {
	if (evtName != null && evtName in handlers) handlers[evtName].push({ func, data, isActorEvent:true, actor });	
}

/*
	Removes an event handler function from the internal arrays, effectively uninstalling it
	Returns the number of removed handlers
*/
function uninstall(evtName, func) {
	const h = handlers[evtName];
	let removed = 0;
	if (h != null) for (let i = h.length; i--;) {
		if (h[i].func === func) {
			removed++;
			h.splice(i, 1);	
		}
	}
	return removed;
}

installHandlers();

export { addEvent, addEventToActor, uninstall, MouseEvts };
