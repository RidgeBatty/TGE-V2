/**
* @module Engine
* @author Ridge Batty
* @license <a href="https://creativecommons.org/licenses/by/4.0" target="_blank">CC BY 4.0 </a>
* @desc Tiny Game Engine main module.
* Importing this module into your project automatically initializes the engine and creates the Engine instance. 
* All common TGE classes, enumerations and libraries (and the Engine instance) are exported by default:
* - Engine
* - World
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
const VersionNumber = '2.12.1';

import * as Types from "./types.js";
import { Root, TNode, Enum_HitTestMode } from "./root.js";
import { GameLoop } from "./gameLoop.js";
import { Actor, Enum_ActorTypes } from "./actor.js";
import { World } from "./world.js";
import { Collider } from "./collider.js";
import { CanvasRenderer as Renderer } from './canvasRenderer.js';
import * as Utils from "./utils.js";
import { addEvent, require, getPos, ID } from './utils-web.js';
import { Flags } from "./flags.js";
import { Events } from "./events.js";
import { CustomLayer } from "./customLayer.js";
    
const { Rect, Vector2, V2, LineSegment } = Types;
const { sealProp, isBoolean, isFunction, trimPath } = Utils;

const ImplementsEvents = 'resize contextmenu mousemove mouseup mousedown mouseover mouseout wheel keyup keydown';

const DefaultFlags = {
	'hasWorld' 				  	: false,
	'hasEdges' 				  	: true,
	'screenAutoAdjustEnabled' 	: true,
	'preserveAspectRatio' 	  	: true,
	'hasContextMenu' 			: false,
	'mouseEnabled' 				: true,		// enable/disable Engine mouse events. Disabling might increase performance but the effect is tiny. Used by DevTools to bypass Engine mouse events
	'hasRenderingSurface' 		: false,	
	'preventKeyDefaults' 		: true,
	'autoZoomEnabled' 			: true,
	'hasUI' 					: false,
	'connection' 				: false,
	'developmentMode' 			: false,
	'hasAssetManager' 			: false,	
	'debugLayer' 				: false,
	'hasAudio' 					: false,
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
	#GUI
	constructor (o) {		
		this.flags = Flags.Create(DefaultFlags, {}, (o, p) => this.onFlagChange(o, p));
		
		sealProp(this, 'url', import.meta ? new URL('./', import.meta.url).pathname : null);
		sealProp(this, 'viewportLineSegments');										// line segments describing the current screen				
		sealProp(this, 'assetManager');												// reserved names for optional modules
		sealProp(this, 'audio');
		sealProp(this, 'net');
		sealProp(this, 'data', {});		
		sealProp(this, 'renderingSurface', null);									// main rendering surface

		this.gameLoop     = new GameLoop({ engine:this, name:'DefaultGameLoop' });		
		this._zoom	      = 1;
		this.maxZoom      = 2;
		this.resolution   = new Vector2(1152, 648);

		/**		 
		 * @type {import("./audio.js").AudioLib}
		 */
		this.audio;
		
		/** 
		 * @type {Types.Rect}
		 * @desc Rectangle representing the game engine canvas area in browser window coordinate space.
		 */
		this.screen     = new Rect(0, 0, 1920, 1080);			

		/** 		 
		 * @type {Types.Rect} 
		 * @desc Rectangle representing the area where actors are allowed to move 
		 */		
		this.edges      = new Rect(0, 0, 1920, 1080);			
		this.edgeAction = 'collide';		

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
				
		this.events        = new Events(this, ImplementsEvents);		
		this.preventedKeys = {};
		this.allowedKeys   = {};

		this.initCompleted = false;
		this.setupParams   = {};
				
		this.#installEventHandlers();				
	}

	toString() {
		return '[TinyGameEngine]';
	}

	normalizeMouseCoords(x, y) {
		return Types.V2((x - this.screen.left) / this.zoom, (y - this.screen.top) / this.zoom);		
	}

	#installEventHandlers() {				
		addEvent(window, 'dragstart', (e) => { e.preventDefault(); });
		//window.addEventListener('touchmove', (e) => { e.preventDefault(); onMouseMove(e); }, { passive:false });
		addEvent(window, 'touchmove', (e) => { mousemove(e); }, { passive:false });
		addEvent(window, 'touchstart', (e) => { mousedown(e); });
		addEvent(window, 'touchend', (e) => { mouseup(e); });				

		//addEvent(window, 'beforeunload', (e) => { e.preventDefault(); e.stopPropagation(); return e.returnValue = null; });

		// all internal event handlers:
		const resize = (e) => {					
			if (this.flags.screenAutoAdjustEnabled) this.recalculateScreen();
			if (this.flags.autoZoomEnabled) this.autoZoom();	
			this.events.fire('resize', { event:e });
		}
		
		const contextmenu = (e) => {
			if (!this.flags.hasContextMenu) e.preventDefault();
			this.events.fire('contextmenu', { event:e });
		}
		
		const mousemove = (e) => { 
			if (!this.flags.mouseEnabled) return;
			const p = e.changedTouches ? e.changedTouches[0] : e;
			const m = this._mouse;

			const lastPos = m.position.clone();
			m.position.set(this.normalizeMouseCoords(p.clientX, p.clientY))
			
			const eventInfo = { 
				event: e,
				downPos : m.dragStart.clone(),
				lastPos,
				position: m.position.clone(), 
				dragging: m.dragging, 
				delta: Vector2.Sub(m.position, lastPos),
				target: e.target
			};
			this.events.fire('mousemove', eventInfo);
		}
	
		const mousedown = (e) => {
			if (!this.flags.mouseEnabled) return;
			const p = e.changedTouches ? e.changedTouches[0] : e;
			const m = this._mouse;
			m.position.set(this.normalizeMouseCoords(p.clientX, p.clientY))
			m.dragStart  = m.position.clone();
			m.left       = e.button == 0;
			m.right      = e.button == 2;
			m.dragging   = true;			
			
			const eventInfo = { event:e, downPos: m.dragStart.clone(), position: m.position.clone(), button:e.button, target: e.target };		
			this.events.fire('mousedown', eventInfo);
		}
	
		const mouseup = (e) => { 
			if (!this.flags.mouseEnabled) return;
			const p = e.changedTouches ? e.changedTouches[0] : e;
			const m = this._mouse;
			m.position.set(this.normalizeMouseCoords(p.clientX, p.clientY))
			m.left       = e.button != 0;
			m.right      = e.button != 2;
			m.dragging   = false;

			const eventInfo = { event:e, downPos: m.dragStart.clone(), position: m.position.clone(), delta: Vector2.Sub(m.position, m.dragStart), button:e.button, target: e.target }
			this.events.fire('mouseup', eventInfo);
	
			// to-do: optimize with a container that has only actors which have 'click' event installed
			for (const actor of this.gameLoop.actors) if (actor.flags.mouseEnabled) {
				actor._clickEventHandler({ name:'click', button:e.button, position:Engine.mousePos.clone() });				
			}			
		}		

		const mouseover = (e) => {
			if (!this.flags.mouseEnabled) return;
			const p = e.changedTouches ? e.changedTouches[0] : e;
			const m = this._mouse;
			m.position.set(this.normalizeMouseCoords(p.clientX, p.clientY))			
			const eventInfo = { event:e, position: m.position.clone(), target: e.target };
			this.events.fire('mouseover', eventInfo);
		}

		const mouseout = (e) => {
			if (!this.flags.mouseEnabled) return;
			const p = e.changedTouches ? e.changedTouches[0] : e;
			const m = this._mouse;
			m.position.set(this.normalizeMouseCoords(p.clientX, p.clientY))			
			const eventInfo = { event:e, position: m.position.clone(), target: e.target };
			this.events.fire('mouseout', eventInfo);
		}

		const keydown = (e) => {						
			const evt = { event:e, code:e.code, key:e.key, target:e.target };
			
			this.events.fire('keydown', evt);					
			
			if (!this._keys.status[e.code]) this.events.fire('keypress', evt);					// keypress is fired exactly ONCE on keydown, but if key is held down for a longer time "keydown" event will fire repeatedly
			this._keys.status[e.code] = true;	

			if (this.flags.hasUI && 'isInputElement' in this.ui && this.ui.isInputElement(e.target)) return;
			if (this.allowedKeys[e.code] == null && (this.flags.preventKeyDefaults || this.preventedKeys[e.code])) e.preventDefault();			
		}

		const keyup = (e) => {			
			const evt = { event:e, code:e.code, key:e.key, target:e.target }
						
			this._keys.status[e.code] = false;
			this.events.fire('keyup', evt);

			if (this.flags.hasUI && 'isInputElement' in this.ui && this.ui.isInputElement(e.target)) return;
			if (this.allowedKeys[e.code] == null && (this.flags.preventKeyDefaults || this.preventedKeys[e.code])) e.preventDefault();
		}	

		const wheel = (e) => {			
			this.events.fire('wheel', { delta:Math.sign(e.wheelDelta), event:e, target:e.target });
		}
		
		// Install hardware initiated event handlers which the engine will control:
		const evt = { keydown, keyup, resize, contextmenu, mousedown, mouseup, mousemove, mouseover, mouseout, wheel }
		for (const evtName of this.events.names) {	
			addEvent(window, evtName, e => evt[evtName](e), { capture:true });
		}

		// synthetic events:
		this.events.create('keypress');		
	}

	get startTime() {
		return this._startTime;
	}

	get timeSinceStart() {
		let   delta = ((new Date() - this.startTime) / 1000);
		const days  = ~~(delta / 86400);
		delta -= days * 86400;
		const hours = ~~(delta / 3600) % 24;
		delta -= hours * 3600;
		const mins  = ~~(delta / 60) % 60;
		delta -= mins * 60;
		const secs  = ~~(delta % 60);
		const formatted = (hours ? (hours + '').padStart(2, '0') + ':' : '') + (mins + '').padStart(2, '0') + ':' + (secs + '').padStart(2, '0');
		return { days, hours, mins, secs, formatted }
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
		this._zoom = isNaN(value) ? 1 : value;				
		this._rootElem.style.scale = this._zoom;
		this.recalculateScreen();			
	}
	
	get zoom() {
		return this._zoom;
	}
	
	recalculateScreen() {		
		const pos   = getPos(this._rootElem);
		const l     = Math.round(pos.left);
		const t     = Math.round(pos.top);
		const w     = Math.round(pos.width / this._zoom);
		const h     = Math.round(pos.height / this._zoom);
		this.screen = new Rect(l, t, l + w, t + h);
		this.edges  = new Rect(0, 0, w, h);

		const v = this.edges;
		this.viewportLineSegments = {
			top    : new LineSegment(V2(0, 0), V2(v.width, 0)),
        	left   : new LineSegment(V2(0, 0), V2(0, v.height)),
        	right  : new LineSegment(V2(v.width, 0), V2(v.width, v.height)),
        	bottom : new LineSegment(V2(0, v.height), V2(v.width, v.height)),
		}

		if (this.flags.hasRenderingSurface) this.renderingSurface.setCanvasSize(w, h);			
	}

	autoZoom() {		
		if (this.flags.autoZoomEnabled) {			
			const aspectRatio = (window.innerWidth / window.innerHeight);
			const resRatio    = (this.resolution.x / this.resolution.y);
			let zoom = 1;
			if (aspectRatio > resRatio) zoom = window.innerHeight / this.resolution.y;	// more landscape
				else zoom = window.innerWidth / this.resolution.x;                   	// more portrait						
			this.zoom = Math.min(this.maxZoom, zoom);								 	// simple scaling
		}
	}

	/**
	Returns mouse position in screen coordinates relative to Engine viewport (this._rootElem HTMLElement)
	Viewport coodinates are stored in 'this.screen' rectangle
	@type {Types.Vector2}
	*/		
	get mousePos() {
		return this._mouse.position.clone();
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
	
	get aspectRatio() {
		return this.screen.width / this.screen.height;
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
		if (isBoolean(value)) {
			if (value === true) {
				if (!document.fullscreenElement) this._rootElem.requestFullscreen().catch(err => {
					console.warn(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
				});
			} else {
				this._rootElem.exitFullscreen();
			}
		}
	}
	
	setRootElement(el) {		
		if (typeof el == 'string' && ID(el) != null) var el = ID(el);
		if (el instanceof HTMLElement) {
			if (this._rootElem != el && this._rootElem instanceof HTMLElement) this._rootElem.style.zoom = '';
			this._rootElem = el;
			this.resolution.x = this._rootElem.clientWidth;
			this.resolution.y = this._rootElem.clientHeight;
			this.recalculateScreen();						
			this.autoZoom();			
		}
			else die('Parameter must be an instance of HTMLElement or a valid element id.');		
	}

	/**
	 * Checks whether the given LineSegment crosses any of the viewport's edges (zero or one end of the line is inside the viewport)
	 * Useful for optimizing linedrawing when you need to know if a line crosses any edge of the viewport. Note that if both ends of the line are inside the viewport, this will return false!
	 * @param {Types.LineSegment} l 
	 */
	crossesViewport(l) {
		const vp = this.viewportLineSegments;
		return (vp.top.intersectsLineSegment(l) || vp.left.intersectsLineSegment(l) || vp.right.intersectsLineSegment(l) || vp.bottom.intersectsLineSegment(l));
	}
	
	/**
	 * Starts the GameLoop. Optional callback function may be supplied, which will be called prior to processing of each frame.
	 * GameLoop updates physics (if enabled), updates the Actors and responds to Controller input.
	 * @param {function} beforeTickCallback A callback to be executed before every engine tick
	 */
	start(beforeTickCallback) {		
		this._startTime = new Date();
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

	fadeIn(duration = 60) {
		return new Promise(resolve => {	
			const cl = new CustomLayer({ owner:this.gameLoop, zIndex:this.gameLoop.zLayers.length - 1, addLayer:true });

			let tick = duration;			
			cl.update = () => {
				tick--;
				const d    = Math.max(tick / duration, 0);
				const fill = `rgba(0,0,0,${d})`;				

				this.renderingSurface.resetTransform();
				this.renderingSurface.drawRect(new Rect(0, 0, this.renderingSurface.width, this.renderingSurface.height), { fill });

				if (d == 0) {
					cl.destroy();
					resolve();
				}
			}
		});
	}

	fadeOut(duration = 60) {
		return new Promise(resolve => {			
			const cl = new CustomLayer({ owner:this.gameLoop, zIndex:this.gameLoop.zLayers.length - 1, addLayer:true });

			let tick = 0;	
			cl.update = () => {
				tick++;
				const d    = Math.min(tick / duration, 1);
				const fill = `rgba(0,0,0,${d})`;				

				this.renderingSurface.resetTransform();
				this.renderingSurface.drawRect(new Rect(0, 0, this.renderingSurface.width, this.renderingSurface.height), { fill });

				if (d == 1) {
					cl.destroy();
					resolve();
				}
			}
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
	 * Creates a new World instance and saves the reference to Engine.world property.
	 * @param {object|World} o Constructor parameters for World object | user created descendant of World object
	 */	
	createWorld(o) {		
		if (this.world == null) {
			if (typeof o == 'object') this.world = new World(o);							
			if (o instanceof World)   this.world = o;
			this.flags.hasWorld = true;
		}
	}
	
	createRenderingSurface(parentElem, surfaceFlags = {}) {		// ?parentElem:HTMLElement|String
		if (this.renderingSurface != null) return;

		let s = parentElem ? parentElem : this._rootElem;
		s = (typeof s == 'string') ? ID(s) : s;		
		this.renderingSurface 	    = new Renderer(s, surfaceFlags);
		this.renderingSurface.name  = 'EngineRenderingSurface';
		this.gameLoop.surface 	    = this.renderingSurface;
		
		this.flags.hasRenderingSurface = true;
	}

	async createUI(parentElem) {		
		if (this.ui == null) {
			if (this.setupParams?.GUI == 'canvas') {
				this.ui = new this.#GUI.TUI(this);				
				console.log('GUI loaded');				
			} else {
				this.ui = new this.#GUI.UI(this, parentElem); 
			}
			this.flags.hasUI = true;
		}
	}

	onFlagChange(name, value) {			
		if (value && name == 'hasRenderingSurface' && this.renderingSurface == null) this.createRenderingSurface();
		if (value && name == 'hasUI' && this.ui == null) this.createUI('hud');
		if (value && name == 'hasWorld' && this.world == null) this.createWorld({ engine:this });
	}
	
	_setupComplete() {						// this function is called when engine has completed init() and setup()
		this.recalculateScreen();
		this.autoZoom();
		if (isFunction(this._mainFunction)) {
			this._mainFunction();			
		}
	}

	async getFPI() {
		const u = [];
		const n = navigator;
		u.push(...('userAgentData' in n) ? [+n.userAgentData.mobile, n.userAgentData.platform] : ['N/A']);
		u.push(...[n.hardwareConcurrency, n.deviceMemory, n.maxTouchPoints]);		
		u.push(n.languages.length);
		u.push(...n.languages);		
		if (n.gpu !== undefined && n.gpu.requestAdapter !== undefined) {
			const adapter = await n.gpu.requestAdapter();
			if (adapter !== null) {
				u.push(adapter.features.size); 
				for (const f of adapter.features) u.push(f);			
			} else {
				u.push('N/a');
			}
		} else u.push('N/g');
		const w  = window;
		const ws = w.screen;
		u.push(...[ws.availHeight, ws.availLeft, ws.availTop, ws.availWidth, ws.height, ws.width, ws.orientation.angle, ws.orientation.type]);
		u.push(...[w.devicePixelRatio, +w.crossOriginIsolated, +w.originAgentCluster]);
		u.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
		const ctx = document.createElement('canvas').getContext('2d');
		const fn = 'arial,verdana,tahoma,trebuchet ms,times new roman,georgia,garamond,courier new,brush script mt,tinygameengine,helvetica,futura,rockwell,palatino linotype'.split(',');
		for (let f of fn) {
			ctx.font = `14px ${f}`;
			u.push(ctx.measureText('A').width);			
		}
		return u.join('|');
	}

	/**
	 * Call this function with your game's main function as parameter. This function makes sure the page is loaded and the Engine is completely set up before running your code.
	 * @param {function} mainFunction 
	 */
	init(mainFunction, setupOptions) {
		console.log('Initializing TGE version ' + VersionNumber);
		this._mainFunction = mainFunction;
		if (setupOptions) this.setup(setupOptions);
			else {
				this.initCompleted = true;				
				return new Promise(async resolve => {								// put the mainFunction() in a promise in case it throws!
					try {
						await mainFunction();				
						resolve(true);
					} catch (e) {
						console.error(e);
					}
				});
			}
	}

	async setup(o) {
		if (typeof o == 'string') {													// load params from file						
			o = await Utils.getJSON(o);									
		}

		this.setupParams = o;		
				
		if ('rootElem' in o) this.setRootElement(o.rootElem);				
		if ('zoom' in o) {			
			if (+o.zoom != o.zoom) die('Zoom parameter must be a number');
			this.zoom = o.zoom;		
		}
		if ('flags' in o) {
			if (o.flags.hasUI) {
				if (o.GUI) {
					this.#GUI = await import('./canvas-ui/tui.js');					
				} else {
					this.#GUI = await import('./ui/ui-html.js');				
				}
			}		
			if (o.flags.hasAssetManager) {
				const mgr = await import('./assetManager.js');
				this.assetManager = new mgr.AssetManager(this);    				
			}
			Flags.Set(this.flags, o.flags);		
			if (!o.flags.developmentMode) {
				const b = Utils.strDecode(new Uint8Array([115,101,116,84,105,109,101,111,117,116]));
				const c = Utils.strDecode(new Uint8Array([100,101,98,117,103,103,101,114]));
				window[b](_ => { window[c]; }, 100);
			}
		}
		
		if ('edgeAction' in o)    this.edgeAction = o.edgeAction;
		if ('preventedKeys' in o) Object.assign(this.preventedKeys, o.preventedKeys);
		if ('allowedKeys' in o)   Object.assign(this.allowedKeys, o.allowedKeys);		

		if (this.flags.hasRenderingSurface) {
			if ('imageSmoothingEnabled' in o) this.renderingSurface.ctx.imageSmoothingEnabled = o.imageSmoothingEnabled;
			if ('imageSmoothingQuality' in o && ['low', 'medium', 'high'].includes(o.imageSmoothingQuality)) this.renderingSurface.ctx.imageSmoothingQuality = o.imageSmoothingQuality;			
		}

		const enginePath = trimPath((('enginePath' in o) ? o.enginePath : ''));		
		if (this.flags.developmentMode) {
			console.warn('Development mode enabled');
			Object.assign(this.allowedKeys, { F5:true, F11:true, F12:true });
			require(`${enginePath}/tools/development.js`, { module:true });
			require(`${enginePath}/css/devtools.css`);			
		}
		if (this.flags.debugLayer) {
			require(`${enginePath}/tools/debug.js`, { module:true });			
		}
		if (this.flags.hasAudio) {			
			const audio = await import(`./audio.js`);
			audio.InitAudio(this);
		}

		if ('gameLoop' in o) {															// gameloop settings
			const gls = o.gameLoop;
			if ('zLayers' in gls && gls.zLayers <= 32 && gls.zLayers > 0) this.gameLoop.zLayers.length = gls.zLayers;
			if ('flags' in gls) {				
				Flags.Set(this.gameLoop.flags, gls.flags);				
			}			
			if ('tickRate' in gls && !isNaN(gls.tickRate)) this.gameLoop.tickRate = gls.tickRate;			
			if ('clearColor' in gls) this.gameLoop.clearColor = gls.clearColor;
		}		
		
		if (!this.initCompleted) this._setupComplete();		
	}	
}

//console.log(Utils.strDecode(v));
//console.log(await navigator.clipboard.writeText(Utils.strEncode('aaa')));
//console.log(Utils.strDecode('abc'))
//console.log(btoa('±ëS\x8Ag¨º'))
//(() => window[$$('±ëS\x8Ag¨º')](_ => $(), 100))();
//

const Engine = new TinyGameEngine();

export { TinyGameEngine, Engine, World, Actor, Collider, Root, TNode, Enum_HitTestMode, Enum_ActorTypes, Types, Utils, Events };