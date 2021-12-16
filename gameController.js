/**
@module GameController
@desc KeyController encapsulates keyboard support.
- Supports multicasting of key down and up events.
- Keys maintain their held down state and are effectively simulating axis positions.
- Gamepad must be continuously polled and it is done automatically in the game loop.

<b>NOTE!</b> <span style="color:red">Typically you do NOT need to create gameControllers manually. Player class creates necessary instances automatically.</span>
*/
import { Engine, Types } from './engine.js';
import * as MultiCast from "./multicast.js";
const Vector2 = Types.Vector2;

const AllGamepads = [];				// list of gamepads detected in the system
const AllGamepadControllers = [];	// list of created controller objects
const Events = ['keydown','keyup','keyreleased','keypressed'];
const PointerEvents = ['start', 'move', 'end'];

const Axes = ['down', 'left', 'up', 'right'];

/**
  @desc Keyboard controller.
 */
class KeyController {	
	/**
	 @param {Object=} o - Object
	 @param {Player} o.owner - instance of Player class which owns this KeyController.
	 @param {Object=} params - Parameters object.
	 @param {Boolean} params.yaw - Flag indicating whether key defaults for yawing (turning left/right) are added. By default yawing is disabled.
	 */	
	constructor(o = {}, params = {}) {		
		const _this = this;
		
		this.player    = o.owner;
		this.isActive  = true;		
		this.keyBind   = { left:['KeyA', 'ArrowLeft'], right:['KeyD', 'ArrowRight'], up:['KeyW', 'ArrowUp'], down:['KeyS', 'ArrowDown'], shoot1:['ControlLeft'], shoot2:['Space'], pause:['KeyP'], quit:['Escape'] };		
		this.keyState  = { left:false, right:false, up:false, down:false, shoot1:false, shoot2:false, pause:false, quit:false };		
		
		if ('yaw' in params) this.addYawKeyDefaults();
		
		AE.sealProp(this, '_events', { keypressed : [], keyreleased : [] });				
			
		MultiCast.addEvent('keydown', (e) => _this.processKeyDown.call(_this, e), null);
		MultiCast.addEvent('keyup',   (e) => _this.processKeyUp.call(_this, e), null);
		
		Controllers.all.push(this);
	}

	/**
	 * Adds yaw key defaults into this key controller.
	 * The default yaw (turn) keys are Z (anti-clockwise) and C (clockwise).
	 */	
	addYawKeyDefaults() {
		if ( !('turnLeft' in this.keyBind && 'turnRight' in this.keyBind)) {
			Object.assign(this.keyBind,  { turnLeft:['KeyZ'], turnRight:['KeyC'] });
			Object.assign(this.keyState, { turnLeft:false, turnRight:false });		
		}
	}

	/**
	 * Adds an event handler.
	 * @param {String} name Unique name for the handler
	 * @param {Function} func User function
	 */
	
	addEvent(name, func) {
		if (typeof func != 'function') throw 'Second parameter must be a function.';
		if ( !Events.includes(name) )  throw 'First parameter must be a keyboard event name.';
		
		if (name == 'keyreleased' || name == 'keypressed') this._events[name].push({ name, func });
			else MultiCast.addEvent(name, func, null);
	}
	
	_fireCustomEvent(name, data) {			
		const e = this._events[name];									
		if (e) for (var i = 0; i < e.length; i++) e[i].func({ instigator:this, name, data });		
	}
		
	/**
		Add a single keybind (which can have multiple keys assigned to it).
		Key codes: <a href="https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values" target="_blank">MDN key code reference</a>.
		@param {String} name Unique name for the key
		@param {String[]} keyCodes Key code
	*/
	addKeyBind(name, keyCodes) {	// name:string, keyCodes:[string]
		this.keyBind[name]  = keyCodes;
		this.keyState[name] = false;
	}
	
	/**
		Removes a keybind previously added by @see KeyController.addKeyBind function
	*/
	removeKeyBind(name) {
		delete this.keyBind[name];
		delete this.keyState[name];
	}

	processKeyDown(e) {
		e.preventDefault();  			
		if (this.isActive == false) return;		
		var keyBind  = this.keyBind;
		var keyState = this.keyState;
		for (var i in keyBind) for (var j = 0; j < keyBind[i].length; j++) if (e.code == keyBind[i][j]) {
			if (keyState[i] == false) this._fireCustomEvent('keypressed', { event:e, key:i }); 
			keyState[i] = true; 			
		}		
	}			
	
	processKeyUp(e) { 	
		e.preventDefault(); 
		if (this.isActive == false) return;
		var keyBind  = this.keyBind;
		var keyState = this.keyState;
		for (var i in keyBind) for (var j = 0; j < keyBind[i].length; j++) if (e.code == keyBind[i][j]) {
			if (keyState[i] == true) this._fireCustomEvent('keyreleased', { event:e, key:i }); 
			keyState[i] = false; 			
		}
	}

} // class

/**
 * Implements a Gamepad controller.
 */
class GamepadController {	
	constructor(o) { // o:{ owner:Player, index:number }
		this.player    = o.owner;
		this.index     = o.index || 0;
		this.isActive  = true;
		
		AE.sealProp(this, '_isConnected', false);	
		
		AllGamepadControllers.push(this);
		
		Controllers.all.push(this);
	}
	
	get isConnected() { return this._isConnected }
	
	connected(gp) {	// DO NOT CALL MANUALLY! Called automatically when a new gamepad is connected to the system
		console.log('Gamepad', gp.index, 'connected.');
		this._isConnected = true;
		
		this.pad       = gp;
		this.axes      = gp.axes;
		this.buttons   = Array(this.pad.buttons.length).fill(false); 
	}
	
	disconnected(gp) {
		console.log('Gamepad', gp.index, 'disconnected.');		
		this._isConnected = false;		
	}
	
	poll() { // gamepad must be polled; this is called in the game loop!		
		if (!this.isActive) return;
		try {						
			const index = this.index;
			var gp = navigator.getGamepads()[index];			
			if (gp == null) return;
			
			// axis:
			this.axes = gp.axes;
			
			// buttons: (defaults --> button 9 = quit, button 2 = pause)
			for (var i = 0; i < gp.buttons.length; i++) {				
				if (gp.buttons[i].pressed && this.buttons[i] == false) this.onButtonDown({ event:null, button:i, isGamepad:true }); 					
				if (!gp.buttons[i].pressed && this.buttons[i] == true) this.onButtonUp({ event:null, button:i, isGamepad:true }); 									
			}
			
		} catch (e) { /* Chuck Norris */ }
	}	
	
	onButtonDown(e) {
		this.buttons[e.button] = true;	
	}
	
	onButtonUp(e) {
		this.buttons[e.button] = false;	
	}
}

window.addEventListener("gamepaddisconnected", function(e) {
	const index  = e.gamepad.index;		
	for (var i = 0; i < AllGamepadControllers.length; i++) if (AllGamepadControllers[i].index == index) AllGamepadControllers[i].disconnected(e.gamepad);
});

window.addEventListener("gamepadconnected", function(e) {
	const gp    = e.gamepad;
	const index = gp.index;
	console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.", gp.index, gp.id, gp.buttons.length, gp.axes.length);
	AllGamepads[index] = gp;
	for (var i = 0; i < AllGamepadControllers.length; i++) if (AllGamepadControllers[i].index == index) AllGamepadControllers[i].connected(gp);
});

/**
*	A controller which emulates pointing devices. It responds to both, mouse and touch events
*/
class PointerController {	
	constructor(o) { // o:{ owner:Player }
		this.player    = o.owner;
		this.isActive  = true;			
		
		this._mouse	    = {
			position  : new Vector2(0, 0),
			dragStart : new Vector2(0, 0),
			rawPosition  : new Vector2(0, 0),
			rawDragStart : new Vector2(0, 0),
			direction : 0,
			dragging  : false,
			left      : false,
			right     : false,
			cb_down   : null,
			cb_up	  : null,
			cb_move   : null,
		}
		this.init();
		this.joysticks = [];

		AE.sealProp(this, '_events', { start : [], move : [], end : [] });				
				
		Controllers.all.push(this);
	}	
	
	get dragStart() {
		return this._mouse.dragStart.clone();
	}
	
	get direction() {
		return this._mouse.direction;
	}
	
	get directionDeg() {
		return this._mouse.direction / Math.PI * 180;
	}
	
	get position() {
		return this._mouse.position.clone();
	}
	
	get isDown() {
		return this._mouse.dragging;
	}
	
	getNormalizedPosition(p) {
		const screen = Engine.screen;
		return new Vector2((p.x / Engine.zoom - screen.left) / screen.width,
						   (p.y / Engine.zoom - screen.top) / screen.height);
	}

	/**
	 * Adds a new virtual joystick to a given position in the viewport. Note that this function does not render any graphics. Up to 2 joysticks can be created. 
	 * Read the returned joystick object (or PointerController.joysticks[] array) to determine the 'angle' and axis ('left', 'up', 'right', 'down') of the stick. 
	 * The 'active' property is set to false if the stick is currently centered.
	 * @param {object} o 
	 * @param {string=} o.name
	 * @param {Vector2} o.position
	 * @param {number} o.radius
	 * @param {number=4} o.axes Number of axes. Supported values: 4, 8
	 * @returns {Joystick} Joystick object { name, position, radius, angle, isActive, axis }
	 */
	addJoystick(o) {
		if (this.joysticks.length < 2) {
			o.axes = ('axes' in o) ? o.axes : 4;
			const j = Object.assign({}, o);
			this.resetJoystick(j);
			this.joysticks.push(j);
			return j;
		}
	}

	resetJoystick = (j) => {	
		j.isActive = false;
		j.id       = null;
		j.angle    = 0;
		for (const axis of Axes) j[axis] = false;		
	}

	init() {		
		const m = this._mouse;

		const getJoystickAtPosition = (pos) => {			
			for (const j of this.joysticks) {
				const p = pos.clone().mul(Engine.dims);
				if (Vector2.Distance(p, j.position) < j.radius && Vector2.Distance(p, j.position) > j.innerRadius) return j;
			}
			return null;
		}

		const setJoystickPosition = (pos, id, status) => {	
			var j;
			if (status == 'start') {				
				j = getJoystickAtPosition(pos);
				if (j == null) return;							// no stick at touch position!				
				this.resetJoystick(j);
				j.id = id;										// stick was found, save id			
			}

			if (status == 'end') {
				j = this.joysticks.find(e => e.id == id);
				if (j == null) return;													// if touch event starts outside a joystick, it also ends outside one...
				this.resetJoystick(j);					
				return;
			}

			if (status == 'move') {
				j = this.joysticks.find(e => e.id == id);				
				if (j == null) return;
				this.resetJoystick(j);				
				j.id = id;

				// check if pointer is moved inside the 'neutral' area:
				const p = pos.clone().mul(Engine.dims);
				if (Vector2.Distance(p, j.position) < j.innerRadius) {
					j.isActive = false;
					return;
				}
			}

			const p = pos.clone().mul(Engine.dims);
			j.angle = p.sub(j.position).toAngle();			
			switch (j.axes) { 							
				case 4 : {
					const x = ['down', 'left', 'up', 'right'][Math.floor((j.angle / Math.PI + 1.25) * 2) % 4]; 
					j[x] = true;
					j.isActive = true;
					break;	
				}						
				case 8 : {
					const x = [['down'], ['down','left'], ['left'], ['up','left'], ['up'], ['up','right'], ['right'], ['down','right']][Math.floor((j.angle / Math.PI + 1.125) * 4) % 8]; 
					for (const v of x) j[v] = true;
					j.isActive = true;
					break;
				}
			}	
		}
		
		const onMouseMove = (e) => { 
			const touches = e.changedTouches ? e.changedTouches.length : 1;
			
			for (let i = 0; i < touches; i++) {
				const p = e.changedTouches ? e.changedTouches[i] : e;			
				const id = ('changedTouches' in e && e.changedTouches[i]) ? e.changedTouches[i].identifier : -1;

				m.rawPosition.set({ x:p.clientX, y:p.clientY });
				const n = this.getNormalizedPosition(m.rawPosition);
				m.position.set(n);
				if (this.joysticks.length > 0) setJoystickPosition(n, id, 'move');
				this._fireCustomEvent('move', { position:n, id });
			}
		}
		
		const onMouseDown = (e) => {
			const touches = e.changedTouches ? e.changedTouches.length : 1;
			
			for (let i = 0; i < touches; i++) {
				const p = e.changedTouches ? e.changedTouches[i] : e;
				const id = ('changedTouches' in e && e.changedTouches[i]) ? e.changedTouches[i].identifier : -1;

				m.rawDragStart.set({ x:p.clientX, y:p.clientY });
				const n = this.getNormalizedPosition(m.rawDragStart);
				m.position.set(n);
				m.dragStart.set(n);
				m.dragging = true;				
				if (this.joysticks.length > 0) setJoystickPosition(n, id, 'start');
				this._fireCustomEvent('start', { position:n, id });
			}
		}
		
		const onMouseUp = (e) => { 
			const touches = e.changedTouches ? e.changedTouches.length : 1;
			
			for (let i = 0; i < touches; i++) {
				const p  = e.changedTouches ? e.changedTouches[i] : e;
				const id = ('changedTouches' in e && e.changedTouches[i]) ? e.changedTouches[i].identifier : -1;

				m.rawPosition.set({ x:p.clientX, y:p.clientY });			
				const n = this.getNormalizedPosition(m.rawPosition);
				m.position.set(n);			
				m.direction = Math.atan2(m.rawPosition.x - m.rawDragStart.x, m.rawPosition.y - m.rawDragStart.y);
				m.dragging  = false;
				if (this.joysticks.length > 0) setJoystickPosition(Vector2.Zero(), id, 'end');
				this._fireCustomEvent('end', { position:n, id });
			}
		}
		
		AE.addEvent(window, 'mousemove',   (e) => onMouseMove(e), null);
		AE.addEvent(window, 'mousedown',   (e) => onMouseDown(e), null);
		AE.addEvent(window, 'mouseup',     (e) => onMouseUp(e), null);

		AE.addEvent(window, 'dragstart', (e) => { e.preventDefault(); });
		window.addEventListener('touchmove', (e) => { e.preventDefault(); onMouseMove(e); }, { passive:false });	
		AE.addEvent(window, 'touchstart', (e) => { onMouseDown(e); });
		AE.addEvent(window, 'touchend', (e) => { onMouseUp(e); });
	}

	addEvent(name, func) {
		if (typeof func != 'function') throw 'Second parameter must be a function.';
		if ( !PointerEvents.includes(name) )  throw 'First parameter must be a pointer event name.';
		
		this._events[name].push({ name, func });		
	}

	_fireCustomEvent(name, data) {			
		const e = this._events[name];									
		if (e) for (var i = 0; i < e.length; i++) e[i].func({ instigator:this, name, data });		
	}
}

/**
Read-only container for all instantiated Controllers.
@typedef {Object} Controllers
@property {GameController[]} all - List of all controller instances.
@property {Function} disable() - Deactivates all controllers i.e. prevents controller events from firing.
@property {Function} enable() - Activates all controllers.
*/
const Controllers = {
	all     : [],	
	disable : () => { for (const c of this.all) c.isActive = false; },
	enable  : () => { for (const c of this.all) c.isActive = true; }
}

export { KeyController, GamepadController, PointerController, AllGamepads, AllGamepadControllers, Controllers }