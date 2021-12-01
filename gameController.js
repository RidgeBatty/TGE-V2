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
	
	init() {
		AE.addEvent(window, 'mousemove',   (e) => onMouseMove(e), null);
		AE.addEvent(window, 'mousedown',   (e) => onMouseDown(e), null);
		AE.addEvent(window, 'mouseup',     (e) => onMouseUp(e), null);
		
		const m = this._mouse;
		
		const onMouseMove = (e) => { 
			const p = e.changedTouches ? e.changedTouches[0] : e;			
			m.rawPosition.set({ x:p.clientX, y:p.clientY });
			const n = this.getNormalizedPosition(m.rawPosition);
			m.position.set(n);						
		}
		
		const onMouseDown = (e) => {
			const p = e.changedTouches ? e.changedTouches[0] : e;
			m.rawDragStart.set({ x:p.clientX, y:p.clientY });
			const n = this.getNormalizedPosition(m.rawDragStart);
			m.position.set(n);
			m.dragStart.set(n);
			m.dragging = true;
		}
		
		const onMouseUp = (e) => { 
			const p = e.changedTouches ? e.changedTouches[0] : e;
			m.rawPosition.set({ x:p.clientX, y:p.clientY });			
			const n = this.getNormalizedPosition(m.rawPosition);
			m.position.set(n);			
			m.direction = Math.atan2(m.rawPosition.x - m.rawDragStart.x, m.rawPosition.y - m.rawDragStart.y);
			m.dragging  = false;
		}
		
		AE.addEvent(window, 'dragstart', (e) => { e.preventDefault(); });
		window.addEventListener('touchmove', (e) => { e.preventDefault(); onMouseMove(e); }, { passive:false });	
		AE.addEvent(window, 'touchstart', (e) => { onMouseDown(e); });
		AE.addEvent(window, 'touchend', (e) => { onMouseUp(e); });
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