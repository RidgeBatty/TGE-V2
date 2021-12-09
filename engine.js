/**
* @module Engine
* @author Ridge Batty
* @license <a href="https://creativecommons.org/licenses/by/4.0" target="_blank">CC BY 4.0 </a>
* @desc Tiny Game Engine main module.
* Importing this module into your project automatically initializes the engine and creates the Engine instance. 
* All common TGE classes, enumerations and libraries (and the Engine instance) are exported by default:
* - Engine
* - World
* - Scene
* - Actor
* - Collider
* - Root
* - Enum_HitTestMode
* - Enum_ActorTypes
* - Types
* - Utils
*
* Note that creation and use of World object is optional. All components should work with or without a World.
* For example a space invaders, tetris, pong, asteroids, etc. might have no use of container for static World but a platformer game definitely has.
*  
*/
const VersionNumber = '2.0.0';

import * as MultiCast from "./multicast.js";
import * as Types from "./types.js";
import { Root, Enum_HitTestMode } from "./root.js";
import { GameLoop } from "./gameLoop.js";
import { Actor, Enum_ActorTypes } from "./actor.js";
import { World, Scene } from "./world.js";
import { Collider } from "./collider.js";
import { CanvasRenderer as Renderer } from './canvasRenderer.js';
import * as Utils from "./utils.js";

const Rect         = Types.Rect;
const Vector2	   = Types.Vector2;

const Events 	   = ['resize', 'contextmenu', 'mousemove', 'mouseup', 'mousedown'];
const DefaultFlags = {
	'hasWorld' : false,
	'hasEdges' : true,
	'hasAutoAdjustScreen' : true,
	'preserveAspectRatio' : true,
	'hasContextMenu' : false,
	'mouseEnabled' : false,
}

/**
 * Main class of the TGE. Automatically instantiated singleton class, exported as "Engine".
 * Do not create manually!
 */
class TinyGameEngine {	
	/**
	@param {Object=} o - Not used in current version.
	*/
	constructor (o) {		
		const _this     = this;
		
		AE.sealProp(this, 'flags', DefaultFlags); 				// create default flags and make 'this.flags' immutable
		
		this.gameLoop   = new GameLoop({ engine:this });		

		this._zoom	    = 1;

		/** 
		 * @type {Types.Rect}
		 * @desc Rectangle representing the game engine viewport area in the browser window 
		 */
		this.screen     = new Rect(0, 0, 1920, 1080);			

		/** 		 
		 * @type {Types.Rect} 
		 * @desc Rectangle representing the area where actors are allowed to move 
		 */		
		this.edges      = new Rect(0, 0, 1920, 1080);			

		/**
		 * @type {Types.Vector2}  
		 * @desc Global constant for gravity force
		 */
		this.gravity    = new Vector2(0, 1);
		
		/** 		 
		 * @type {Sounds}		 
		 * @desc Reference to <a href="module-Audio-Sounds.html">Sounds class</a> (audio subsystem)* 
		 */
		this.audio		= null;

		this._rootElem  = document.body;
		
		this._mouse	    = {
			position  : new Vector2(0, 0),
			dragStart : new Vector2(0, 0),
			dragging  : false,
			left      : false,
			right     : false,
			cb_down   : null,
			cb_up	  : null,
			cb_move   : null,
		}
		
		this._keys      = {
			preventDefault : true,
			status    : {},
			cb_down   : null,
			cb_up	  : null,
			cb_press  : null,
		}
		
		AE.sealProp(this, 'url', import.meta ? new URL('./', import.meta.url).pathname : null);
		
		MultiCast.addEvent('contextmenu', (e) => this._onContextMenu(e), null);				
		MultiCast.addEvent('resize', 	  (e) => this._onResizeWindow(e), null);
		MultiCast.addEvent('mousemove',   (e) => onMouseMove(e), null);
		MultiCast.addEvent('mousedown',   (e) => onMouseDown(e), null);
		MultiCast.addEvent('mouseup',     (e) => onMouseUp(e), null);
		MultiCast.addEvent('keydown',     (e) => onKeyDown(e), null);
		MultiCast.addEvent('keyup',       (e) => onKeyUp(e), null);		
		
		const onMouseMove = (e) => { 
			const p = e.changedTouches ? e.changedTouches[0] : e;
			this._mouse.position.x = p.clientX / this.zoom - this.screen.left;
			this._mouse.position.y = p.clientY / this.zoom - this.screen.top;
			if (this._mouse.cb_move) this._mouse.cb_move({ 
				position: this._mouse.position.clone(), 
				dragging: this._mouse.dragging, 
				delta: Vector2.Sub(this._mouse.position, this._mouse.dragStart) 
			});
		}
		const onMouseDown = (e) => {
			const p = e.changedTouches ? e.changedTouches[0] : e;
			const m = this._mouse;
			m.position.x = p.clientX / this.zoom - this.screen.left;
			m.position.y = p.clientY / this.zoom  - this.screen.top;			
			m.dragStart  = this._mouse.position.clone();
			m.left       = e.button == 0;
			m.right      = e.button == 2;
			m.dragging   = true;
			if (m.cb_down) m.cb_down({ position: m.position.clone() });
		}
		const onMouseUp = (e) => { 
			const p = e.changedTouches ? e.changedTouches[0] : e;
			const m = this._mouse;
			m.position.x = p.clientX / this.zoom - this.screen.left;
			m.position.y = p.clientY / this.zoom - this.screen.top;
			m.left       = e.button != 0;
			m.right      = e.button != 2;
			m.dragging   = false;
			if (m.cb_up) m.cb_up({ position : m.position.clone(), delta: Vector2.Sub(m.position, m.dragStart) });
		}
		const onKeyDown = (e) => {			
			if (this._keys.preventDefault) e.preventDefault();
			let result;
			if (this._keys.cb_down) result = this._keys.cb_down({ code:e.code }, e);			
			if (this._keys.cb_press && !this._keys.status[e.code]) this._keys.cb_press({ code:e.code }, e);
			this._keys.status[e.code] = true;						
			return result;
		}
		const onKeyUp = (e) => {			
			if (this._keys.preventDefault) e.preventDefault();
			this._keys.status[e.code] = false;
			if (this._keys.cb_up) return this._keys.cb_up({ code:e.code }, e);
		}
		
		AE.addEvent(window, 'dragstart', (e) => { e.preventDefault(); });
		window.addEventListener('touchmove', (e) => { e.preventDefault(); onMouseMove(e); }, { passive:false });
		//AE.addEvent(window, 'touchmove', (e) => { onMouseMove(e); });
		AE.addEvent(window, 'touchstart', (e) => { onMouseDown(e); });
		AE.addEvent(window, 'touchend', (e) => { onMouseUp(e); });
		
		this.updateFlags();		
	}
	
	/**
	Returns true if the engine seems to be running on mobile device. This test is not 100% accurate.
	@type {Boolean} 
	*/
	get isMobile() {
		if ('orientation' in window.screen) return window.screen.orientation.type == 'portrait-primary';
			else return (window.screen.availHeight / window.screen.availWidth) > 1;
	}
	
	/**
	*	Zoom is designed for scaling the game screen (Engine._rootElem) to make the game element cover the maximum width of a mobile screen.
	*	It does not take account zooming of parent, child or any other HTMLElement. 
	*	Zooming should be done exclusively using this function. Do not set the actual CSS zoom value of any other HTMLElement as
	*	it will break all engine coordinate calculations.
	*	@type {Number}
	*/	
	set zoom(value) {
		if (!isNaN(value)) {
			this._zoom = value;
			this._rootElem.style.zoom = value;
		}
	}
	
	get zoom() {
		return this._zoom;
	}

	/**
	Returns mouse position in screen coordinates relative to Engine viewport (this._rootElem HTMLElement)
	Viewport coodinates are stored in 'this.screen' rectangle
	@type {Types.Vector2}
	*/		
	get mousePos() {
		return this._mouse.position;
	}	

	/**
	Returns Left Mouse Button state
	@type {boolean} 
	*/	
	get LMB() {
		return this._mouse.left;
	}
	
	/**
	Returns Right Mouse Button state
	@type {boolean} 
	*/
	get RMB() {
		return this._mouse.right;
	}
		
	/**
	Returns the version number of the engine. Read only. 
	@type {String} 	
	*/	
	get version() {
		return VersionNumber;
	}
	
	get isPaused() {
		return !this.gameLoop.flags.isRunning;
	}

	get dims() {
		return new Vector2(this.screen.width, this.screen.height);
	}
	
	/**	 
	Flag indicating the existence of World instance (Engine.world) 
	@type {World}
	*/
	get hasWorld() { return this.flags.hasWorld }
	set hasWorld(value) {											// hasWorld cannot be set to false!	
		if (value === true && this.flags.hasWorld == false) {			
			this.world = new World({ owner:this.gameLoop });			
			this.flags.hasWorld = true;
		}
	}	
	
	get hasEdges() { return this.flags.hasEdges }
	set hasEdges(value) { if (AE.isBoolean(value)) this.flags.hasEdges = value; }
	
	set hasContextMenu(value) { if (AE.isBoolean(value)) this.flags.hasContextMenu = value; }
	get hasContextMenu() { return this.flags.hasContextMenu; }

	get aspectRatio() {
		return this.screen.width / this.screen.height;
	}
	
	/**
	 * Current engine frames per second. Average over time period (default past 0.5 seconds).
	 * @returns {Number}
	 */
	getFPS() {
		const len = this.gameLoop.frameTimes.length;
		let   n   = 0;		
		for (var i = 0; i < len; i++) n += this.gameLoop.frameTimes[i];
		return (1000 / (n / len)).toFixed(0);
	}
	
	setMouseCallbacks(o) {
		if ('mousedown' in o) this._mouse.cb_down = o.mousedown;
		if ('mouseup' in o)   this._mouse.cb_up   = o.mouseup;
		if ('mousemove' in o) this._mouse.cb_move = o.mousemove;
	}
	
	setKeyCallbacks(o) {
		if ('keydown' in o)  this._keys.cb_down  = o.keydown;
		if ('keyup' in o)    this._keys.cb_up    = o.keyup;
		if ('keypress' in o) this._keys.cb_press = o.keypress;
	}
	
	/**
	 * Sets the Engine in fullscreen mode.
	 * @param {Boolean} value 
	 */
	setFullscreen(value) { 
		if (AE.isBoolean(value)) {
			if (value === true) {
				if (!document.fullscreenElement) this._rootElem.requestFullscreen().catch(err => {
					console.warn(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
				});
			} else {
				this._rootElem.exitFullscreen();
			}
		}
	}

	/**
	 * 	Set multiple flags at once by providing an object, for example: 
	 *	engine.setFlags({ hasWorld:true, hasEdges:true });
     *	If a defined flag does not exist in the engine, the parameter is silently ignored.
	 *	@param {object} o Key Value object where key is the flag name (string) and value is boolean.
	 */		
	setFlags(o) {	// o:{}		
		if (AE.isObject(o)) Object.keys(o).forEach( key => { if (key in this.flags) this.flags[key] = o[key]} );
	}
	
	/*
		Updates the engine state to match flags register state
	*/
	updateFlags() {
		if (this.flags.hasAutoAdjustScreen) this._onResizeWindow();
	}
	
	recalculateScreen() {
		const pos = AE.getPos(this._rootElem);		
		this.screen = new Rect(pos.left, pos.top, pos.left + pos.width, pos.top + pos.height);
	}

	setRootElement(el) {
		if (typeof el == 'string' && ID(el) != null) var el = ID(el);
		if (el instanceof HTMLElement) this._rootElem = el;
			else throw 'Parameter must be an instance of HTMLElement or a valid element id.';
		this.recalculateScreen();
	}
	
	addEvent(evtName, callback) {
		var i = Events.indexOf(evtName);
		if (i > -1) MultiCast.addEvent(evtName, (e) => callback(e), null);		
	}
	
	_onResizeWindow(e) {		
		if (this.flags.hasAutoAdjustScreen) this.recalculateScreen();
	}
	
	_onContextMenu(e) {
		if (!this.flags.hasContextMenu) e.preventDefault();
	}
			
	/*
		Starts the GameLoop. Optional callback function may be supplied, which will be called prior to processing of each frame.
		GameLoop updates physics (if enabled), updates the Actors and responds to Controller input.
	*/
	start(beforeRenderCallback) {
		this.gameLoop.onBeforeRender = beforeRenderCallback;
		this.gameLoop.start();		
	}
	
	/**
	* Pauses the GameLoop. Frames are not rendered and physics are not updated while in pause mode.
	* Player Controllers will remain enabled and respond to events. Otherwise the user would not be able to exit pause mode using her controller.
	* If this behavior is not desired, Controllers must be detached or deactivated.		
	*/	
	pause() {
		this.gameLoop.pause();
	}
	
	/**
	* Resumes the execution of GameLoop. Previously defined onBeforeRender event is respected. 
	*/
	resume() {
		this.start(this.gameLoop.onBeforeRender);
	}
	/**
	 * Creates a new World instance and saves the reference to Engine.world property.
	 * @param {*} o 	
	 */	
	createWorld(o) {		
		this.world = new World(o);
		this.flags.hasWorld = true;
	}
	
	createRenderingSurface(parentElem) {		// ?parentElem:HTMLElement|String
		let s = parentElem ? parentElem : this._rootElem;
		s = (typeof s == 'string') ? ID(s) : s;
		
		this.renderingSurface = new Renderer(s);
	}

	fadeOut(duration = 60) {
		return new Promise(resolve => {			
			this.gameLoop.addTimer({ duration, onTick:(e) => {
				const d = 1 - e.ticksLeft / e.duration;
				const fill = `rgba(0,0,0,${d})`;				
				this.renderingSurface.drawRect(0, 0, Engine.renderingSurface.width, Engine.renderingSurface.height, { fill });
			}, onComplete:() => { resolve(); } });
		});
	}

	/*
	 * 
	 * @param {string} actorType 
	 * @param {*} o 
	 * @returns {Actor}	 
	 * Creates a new Actor and returns it.
	 */
	 addActor(actorType, o) {
		return this.gameLoop.add(actorType, o);
	}

	/**
	 * Creates and initialized new Scene instance and returns it.
	 * @param {Object=} o 
	 * @param {callback} o.onSceneReady Called when the Scene initialization is complete.
	 * @param {Object} o.tiles Tilemap information, see <a href="">World</a>
	 * @returns {Scene}
	 */	
	addScene(o) {		
		if (this.world == null) throw 'Engine: World must be enabled for this method to work! Try setting Engine.hasWorld = true.';
		
		o.onMapLoaded = onMapLoaded;
		var scene     = this.world.createScene(o);		
		function onMapLoaded() {			
			if ('tiles' in o) {
				var tileMap = scene.createTileMap();								
				for (var i = 0; i < o.tiles.length; i++) tileMap.add(o.tiles[i].id, o.tiles[i]);				
				if ('onSceneReady' in o && typeof o.onSceneReady == 'function') tileMap.load({ onLoaded:o.onSceneReady });
			}			
		}
		return scene;
	}	
}

console.log('Initializing TGE version ' + VersionNumber);

const Engine = new TinyGameEngine();

export { Engine, World, Scene, Actor, Collider, Root, Enum_HitTestMode, Enum_ActorTypes, Types, Utils };