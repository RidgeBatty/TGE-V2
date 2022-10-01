/**
* @module Engine
* @author Ridge Batty
* @license <a href="https://creativecommons.org/licenses/by/4.0" target="_blank">CC BY 4.0 </a>
* @desc Tiny Game Engine main module.
* Importing this module into your project automatically initializes the engine and creates the Engine instance. 
* All common TGE classes, enumerations and libraries (and the Engine instance) are exported by default:
*
* World, Scene, Actor, Collider, Root, Enum_HitTestMode, Enum_ActorTypes, Types, Utils, Events
*
* Note that creation and use of World object is optional. All components should work with or without a World.
* For example a space invaders, tetris, pong, asteroids, etc. might have no use of container for static World but a platformer game definitely has.
*
*/
const VersionNumber = '2.2';

import * as Types from "./types.js";
import { Root, Enum_HitTestMode } from "./root.js";
import { GameLoop } from "./gameLoop.js";
import { Actor, Enum_ActorTypes } from "./actor.js";
import { World, Scene } from "./world.js";
import { Collider } from "./collider.js";
import { CanvasRenderer as Renderer } from './canvasRenderer.js';
import * as Utils from "./utils.js";
import { Flags } from "./flags.js";
import { Events } from "./events.js";
import { UI } from "./ui/ui-html.js";
    
const Rect         = Types.Rect;
const Vector2	   = Types.Vector2;

const ImplementedEvents = 'resize contextmenu mousemove mouseup mousedown mousewheel keyup keydown keypress';

const DefaultFlags = {
	'hasWorld' : false,
	'hasEdges' : true,
	'screenAutoAdjustEnabled' : true,
	'preserveAspectRatio' : true,
	'hasContextMenu' : false,
	'mouseEnabled' : true,						// enable/disable Engine mouse events. Disabling might increase performance but the effect is tiny. Used by DevTools to bypass Engine mouse events
	'hasRenderingSurface' : false,	
	'preventKeyDefaults' : true,
	'hasUI' : false,
}

const die = (msg) => {
	try {
		const err  = new Error().stack;
		const func = err.split('\n')[2].split('at ')[1];
		console.error(msg + ' at ' + func);
	} catch (e) {
		console.error(msg);
	}
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
		AE.sealProp(this, 'flags', new Flags(DefaultFlags, (a, b) => this.onFlagChange(a, b))); 				// create default flags and make 'this.flags' immutable
		AE.sealProp(this, 'url', import.meta ? new URL('./', import.meta.url).pathname : null);
		
		this.renderingSurface = null;
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
		}
		
		this._keys      = {
			status    : {},			
		}
				
		this.events        = new Events(ImplementedEvents);		
		this.preventedKeys = {};
		
		this.#installEventHandlers();				
	}

	#installEventHandlers() {				
		AE.addEvent(window, 'dragstart', (e) => { e.preventDefault(); });
		//window.addEventListener('touchmove', (e) => { e.preventDefault(); onMouseMove(e); }, { passive:false });
		AE.addEvent(window, 'touchmove', (e) => { onmousemove(e); }, { passive:false });
		AE.addEvent(window, 'touchstart', (e) => { onmousedown(e); });
		AE.addEvent(window, 'touchend', (e) => { onmouseup(e); });

		// added in 2.0.5 to make sure we get the window dimensions right even when the developer tools is open
		AE.addEvent(window, 'load', (e) => {
			this.recalculateScreen();
			if (AE.isFunction(this._mainFunction)) this._mainFunction();
		});			

		// all internal event handlers:
		const onresize = (e) => {
			if (this.flags.getFlag('screenAutoAdjustEnabled')) this.recalculateScreen();
		}
		
		const oncontextmenu = (e) => {
			if (!this.flags.getFlag('hasContextMenu')) e.preventDefault();
		}
		
		const onmousemove = (e) => { 
			if (!this.flags.getFlag('mouseEnabled')) return;
			const p = e.changedTouches ? e.changedTouches[0] : e;
			this._mouse.position.x = p.clientX / this.zoom - this.screen.left;
			this._mouse.position.y = p.clientY / this.zoom - this.screen.top;

			this.events.fire('mousemove', { 
				downPos : this._mouse.dragStart.clone(),
				position: this._mouse.position.clone(), 
				dragging: this._mouse.dragging, 
				delta: Vector2.Sub(this._mouse.position, this._mouse.dragStart),
				target: e.target
			});
		}
	
		const onmousedown = (e) => {
			if (!this.flags.getFlag('mouseEnabled')) return;
			const p = e.changedTouches ? e.changedTouches[0] : e;
			const m = this._mouse;
			m.position.x = p.clientX / this.zoom - this.screen.left;
			m.position.y = p.clientY / this.zoom  - this.screen.top;			
			m.dragStart  = this._mouse.position.clone();
			m.left       = e.button == 0;
			m.right      = e.button == 2;
			m.dragging   = true;
			
			this.events.fire('mousedown', { target:e.target, event:e, downPos: m.position.clone(), position: m.position.clone(), button:e.button, target: e.target });
		}
	
		const onmouseup = (e) => { 
			if (!this.flags.getFlag('mouseEnabled')) return;
			const p = e.changedTouches ? e.changedTouches[0] : e;
			const m = this._mouse;
			m.position.x = p.clientX / this.zoom - this.screen.left;
			m.position.y = p.clientY / this.zoom - this.screen.top;
			m.left       = e.button != 0;
			m.right      = e.button != 2;
			m.dragging   = false;
			
			this.events.fire('mouseup', { position : m.position.clone(), delta: Vector2.Sub(m.position, m.dragStart), button:e.button, target: e.target });
	
			// to-do: optimize with a container that has only actors which have 'click' event installed
			for (const actor of this.gameLoop.actors) if (actor.flags.mouseEnabled) {
				for (const evt of actor._events.click) {
					actor._clickEventHandler({ name:'click', button:e.button, position:Engine.mousePos.clone() });
				}
			}			
		}		

		const onkeydown = (e) => {						
			if (this.flags.getFlag('preventKeyDefaults') || this.preventedKeys[e.code]) e.preventDefault();
			let result;
			this.events.fire('keydown', { code:e.code, key:e.key, event:e });			
			if (!this._keys.status[e.code]) this.events.fire('keypress', { code:e.code, key:e.key, event:e });
			this._keys.status[e.code] = true;						
			return result;
		}

		const onkeyup = (e) => {			
			if (this.flags.getFlag('preventKeyDefaults') || this.preventedKeys[e.code]) e.preventDefault();			
			this._keys.status[e.code] = false;
			this.events.fire('keyup', { code:e.code, key:e.key, event:e });						
		}	
		
		const evt = { onkeydown, onkeyup, onresize, oncontextmenu, onmousedown, onmouseup, onmousemove }
		for (const evtName of ImplementedEvents.split(' ')) {	
			AE.addEvent(window, evtName, e => evt['on' + evtName](e));
		}				
	}

	get viewport() {		
		return new Rect(0,0, this.screen.width, this.screen.height);
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
	get hasWorld() { return this.flags.getFlag('hasWorld') }
	set hasWorld(value) {											// hasWorld cannot be set to false!	
		if (value === true && !this.flags.getFlag('hasWorld')) {			
			this.world = new World({ owner:this });			
			this.flags.setFlag('hasWorld');
		}
	}	
	
	get hasEdges() { return this.flags.getFlag('hasEdges') }
	set hasEdges(value) { this.flags.setFlag('hasEdges', value); }
	
	set hasContextMenu(value) { this.flags.setFlag('hasContextMenu', value); }
	get hasContextMenu() { return this.flags.getFlag('hasContextMenu'); }

	get aspectRatio() {
		return this.screen.width / this.screen.height;
	}

	/**
	 * Call this function with your game's main function as parameter. This function makes sure the page is loaded and the Engine is completely set up before running your code.
	 * @param {function} mainFunction 
	 */
	init(mainFunction) {
		this._mainFunction = mainFunction;
	}
	
	/**
	 * Current engine frames per second. Average over time period (default: past 0.5 seconds).
	 * @returns {Number}
	 */
	getFPS() {
		const len = this.gameLoop.frameTimes.length;
		let   n   = 0;		
		for (var i = 0; i < len; i++) n += this.gameLoop.frameTimes[i];
		return (1000 / (n / len)).toFixed(0);
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

	recalculateScreen() {		
		const pos = AE.getPos(this._rootElem);
		this.screen = new Rect(pos.left, pos.top, pos.left + pos.width, pos.top + pos.height);
		this.edges  = new Rect(0, 0, pos.width, pos.height);
		if (this.flags.getFlag('hasRenderingSurface')) this.renderingSurface.setCanvasSize(pos.width, pos.height);
	}

	setRootElement(el) {		
		if (typeof el == 'string' && ID(el) != null) var el = ID(el);
		if (el instanceof HTMLElement) this._rootElem = el;
			else die('Parameter must be an instance of HTMLElement or a valid element id.');
		this.recalculateScreen();
	}
				
	/**
	 * Starts the GameLoop. Optional callback function may be supplied, which will be called prior to processing of each frame.
	 * GameLoop updates physics (if enabled), updates the Actors and responds to Controller input.
	 * @param {function} beforeTickCallback A callback to be executed before every engine tick
	 */
	start(beforeTickCallback) {
		this.gameLoop.onBeforeTick = beforeTickCallback;
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

	fadeOut(duration = 60) {
		return new Promise(resolve => {			
			this.gameLoop.addTimer({ duration, onTick:(e) => {
				const d = 1 - e.ticksLeft / e.duration;
				const fill = `rgba(0,0,0,${d})`;				
				this.renderingSurface.drawRect(0, 0, this.renderingSurface.width, this.renderingSurface.height, { fill });
			}, onComplete:() => { resolve(); } });
		});
	}

	/**
	 * Creates a new Actor, adds it in the gameLoop and returns the Actor. 
	 * @param {string} actorType 
	 * @param {object} o 
	 * @returns {Actor|Player|Enemy|Projectile}
	 */
	addActor(actorType, o) {
		return this.gameLoop.add(actorType, o);
	}

	/**
	 * Creates a new gameLoop layer, adds it in the gameLoop and returns the Layer.
	 * Layers are lightweight (background) images which can be scrolled and repeated indefinitely
	 * @param {object} o 
	 * @returns {Layer}
	 */
	addLayer(o) {
		return this.gameLoop.add('layer', o);
	}

	/**
	 * Creates and initialized new Scene instance and returns it.
	 * @param {Object=} o 
	 * @param {callback} o.onSceneReady Called when the Scene initialization is complete.
	 * @param {Object} o.tiles Tilemap information, see <a href="">World</a>
	 * @returns {Scene}
	 */	
	addScene(o) {		
		if (this.world == null) die('World must be enabled for this method to work! Try setting Engine.hasWorld = true.');
		
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

	/**
	 * Creates a new World instance and saves the reference to Engine.world property.
	 * @param {*} o 	
	 */	
	createWorld(o) {		
		if (this.flags.getFlag('hasWorld') == false) {
			this.world = new World(o);
			this.flags.setFlag('hasWorld');
		}
	}
	
	createRenderingSurface(parentElem, surfaceFlags = {}) {		// ?parentElem:HTMLElement|String
		if (this.renderingSurface != null) return;

		let s = parentElem ? parentElem : this._rootElem;
		s = (typeof s == 'string') ? ID(s) : s;		
		this.renderingSurface = new Renderer(s, surfaceFlags);
		this.flags.setFlag('hasRenderingSurface');
	}

	createUI(parentElem) {
		if (this.ui == null) {
			this.ui = new UI(this, parentElem); 
			this.flags.setFlag('hasUI');
		}
	}

	onFlagChange(name, value) {
		if (value && name == 'hasRenderingSurface' && this.renderingSurface == null) this.createRenderingSurface();
		if (value && name == 'hasUI' && this.ui == null) this.createUI('hud');
	}

	setup(o) {
		if ('rootElem' in o) this.setRootElement(o.rootElem);
		if ('clearColor' in o) this.gameLoop.clearColor = o.clearColor;
		if ('flags' in o) this.flags.some(o.flags);				
		if ('zoom' in o) {			
			if (+o.zoom != o.zoom) die('Zoom parameter must be a number');
			this.zoom = o.zoom;		
		}
		if ('gameLoop' in o) {
			if ('flags' in o) {
				for (const [k, v] of Object.entries(o.gameLoop.flags)) {
					o.gameLoop.flags[k] = v;
				}
			}			
		}
	}
}

console.log('Initializing TGE version ' + VersionNumber);

const Engine = new TinyGameEngine();

export { TinyGameEngine, Engine, World, Scene, Actor, Collider, Root, Enum_HitTestMode, Enum_ActorTypes, Types, Utils, Events };