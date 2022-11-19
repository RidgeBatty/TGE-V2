/*


	GameLoop encapsulates the basic functionality of main game loop
	

*/
import { Hitpoints } from './actor-hp.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Projectile } from './projectile.js';
import { Actor, Enum_ActorTypes } from './actor.js';
import { Layer } from './layer.js';
import { Events } from './events.js';

import { Vector2 } from './types.js';
import { Engine } from './engine.js';
import { HitTestFlag, Enum_HitTestMode } from './root.js';

const ImplementsEvents = 'addactor';

class HitTestGroups { constructor() { Object.keys(HitTestFlag).forEach(e => this[e] = []); }; clear() { Object.keys(HitTestFlag).forEach(e => this[e].length = 0); } }

class GameLoop {	
	constructor(o = {}) {
		this.engine         = 'engine' in o ? o.engine : null;
		this.data           = {};	// user data
		this._flags		    = { isRunning:false, showColliders:false, collisionsEnabled:false, showBoundingBoxes:false };
		this.flags          = Object.seal(this._flags);  // flags
		this.events         = new Events(this, ImplementsEvents);
		
		this.levels         = [];
		this.players        = [];	
		this.actors         = [];
		this.tickables      = [];
		this.zLayers        = [...Array(16).keys()].map(e => []);
		this.clearColor     = null;
		
		this.overlaps       = [];			// list of overlapping objects during the current frame, after overlap calculations
		this.hitTestGroups  = new HitTestGroups();
		this.overTests      = 0;
		
		// events:
		this.onBeforeRender = ('onBeforeRender' in o && typeof o.onBeforeRender == 'function') ? o.onBeforeRender : null; 
		this.onBeforeTick   = ('onBeforeTick' in o && typeof o.onBeforeTick == 'function') ? o.onBeforeTick : null; 
		this.onPanic        = ('onPanic' in o && typeof o.onPanic == 'function') ? o.onPanic : null;
		this.timers		    = [];
		
		// other:
		this._lastTick		= 0;
		this._lastTickLen   = 0;
		this._tickRate      = 1000 / 60;	// ms
		this._tickQueue	    = 0;
		this.tickCount      = 0;
		
		this._frameStart    = null;
		this.frameDelta     = 0;
		this.frameStartTime = 0;
		this.frameCount     = 0;
		this.frameTimes     = [];
		this.requestID      = null;	

		this.collisionCheckTime = 0;		// time spent checking for collisions/overlaps

		this.container      = null;			// if defined, actors are created inside this container (overriding engine.rootElem)
		
		// handle browser throttling
		let wasRunningBeforeVisibilityChange = false;
		AE.addEvent(document, 'visibilitychange', e => {
			if (document.visibilityState == 'hidden') {
				if (this.flags.isRunning) {
					wasRunningBeforeVisibilityChange = true;
					return this.stop();
				}
			}
			if (document.visibilityState == 'visible') {
				if (wasRunningBeforeVisibilityChange) {
					wasRunningBeforeVisibilityChange = false;
					return this.start();			
				}
			}
		});	
	}

	/**
	 * Set GameLoop tick rate as in frames per second (Default = 60)
	 */
	set tickRate(fps = 60) {		
		this._tickRate = 1000 / AE.clamp(fps, 1, 1000);
	}

	/**
	 * Returns GameLoop running time in seconds
	 */
	get runningTime() {
		return this.tickCount / (1000 / this._tickRate);
	}

	/**
	 * Converts seconds to frames taking a custom FPS setting into account
	 * @param {Number} sec - Number of seconds (float) to convert to frames (integer)
	 * @returns 
	 */
	seconds(sec) {		
		return Math.round(sec * (1000 / this._tickRate));
	}

	/**
	 * 
	 * @param {object} o 
	 * @param {string=} o.name User defined name
	 * @param {Actor=} o.actor Ties timer to an actor. When the actor is destroyed, the timer is also removed
	 * @param {number} o.duration How many ticks between 
	 * @param {number} o.repeat How many times the timer should repeat?
	 * @param {function=} o.onTick Fires on every tick
	 * @param {function=} o.onRepeat Fires when the cycle repeats
	 * @param {function=} o.onComplete Fires when the repeats are used up and the timer is destroyed
	 */
	addTimer(o) {
		const repeatsLeft = ('repeat' in o) ? o.repeat : 1;
		const timer = Object.assign({ ticksLeft : o.duration, repeatsLeft, isPaused:false }, o);
		this.timers.push(timer);
		return timer;
	}

	/**
	 * Immediately removes all timers from GameLoop without firing any of their events
	 */
	clearTimers() {
		this.timers.length = 0;
	}

	/**
	 * Deletes a timer by name or reference.
	 * @param {Timer|string} nameOrRef Name of the timer or reference to the timer
	 * @returns {boolean} true if the timer was deleted
	 */
	deleteTimer(nameOrRef) {
		const index = typeof (nameOrRef == 'string') ? this.timers.findIndex(e => e.name == nameOrRef) : this.timers.findIndex(e => e == nameOrRef);		
		if (index > -1) {
			this.timers.splice(index, 1);	
			return true;
		}
	}
	
	/**
	 * Loops through all actors and issues a callback
	 * @param {function} cb 	 
	 */
	forActors(cb) {
		const a = this.actors;
		for (let i = a.length; i--;) if (a[i].flags.isDestroyed == false) cb(a[i]);
	}
		
	/**
	 * 	Loops through all actors and returns an array of actors based on their field values
	 * @param {string} field The field name you want to test (e.g. 'name', 'position', etc.)
	 * @param {string} value The field value which needs to match
	 * @returns {[Actor]} Array of actors
	 */
	findActors(field, value) {
		var list = [];
		for (const actor of this.actors) if (actor[field] == value) list.push(actor);
		return list;
	}	

	findTimerByName(name) {
		return this.timers.find(e => e.name == name);
	}

	/**
	 * Loops through all actors and returns the first actor with searched name
	 * @param {string} name 
	 * @returns {Actor}
	 */
	findActorByName(name) {		
		for (const actor of this.actors) if (actor.name == name) return actor;
		return null;
	}	

	removeActor(actor) {		
		for (const olap of actor.overlaps) {										// signal "endoverlap" to all actors which this actor overlaps with
			olap.overlaps = olap.overlaps.filter(e => e != actor);					// remove destroyed actor from (all the) other actors' overlaps list!
			actor.events.fire('endoverlap', { actor, otherActor:olap });	
		}
		
		const c = this.removeFromZLayers(actor);									// remove from zLayers

		let success = false;
		for (let i = this.actors.length; i--;) if (this.actors[i] == actor) {
			this.actors.splice(i, 1);
			success = true;
			if (!actor.flags.isDestroyed) actor.destroy();
		}		
	}

	get isRunning() { return this.flags.isRunning; }
	set isRunning(b) { this.flags.isRunning = (b === true) ? true : false; }

	/**
	 * @deprecated
	 */
	hideColliders() { this.flags.showColliders = false; }				

	/**
	 * @deprecated
	 */
	showColliders() { this.flags.showColliders = true; }

	/**
	 * 	Set multiple flags at once by providing an object, for example: 
	 *	engine.setFlags({ hasWorld:true, hasEdges:true });
     *	If a defined flag does not exist in the engine, the parameter is silently ignored.
	 *	@param {object} o Key Value object where key is the flag name (string) and value is boolean.
	 */		
	 setFlags(o) {
		const _this = this;
		if (AE.isObject(o)) Object.keys(o).forEach( key => { 
			if (key in this.flags) {				
				this.flags[key] = o[key];				// after the create functions are called!
			}
		});
	}

	/**
	 * WARNING! For engine internal use. Adds an Actor into zLayers and actors collection and fires the gameLoop's addactor event.
	 * @param {Actor} actor class instance
	 */
	_addActor(actor) {
		actor.owner = this;
		this.zLayers[actor.zIndex].push(actor);	
		this.actors.push(actor);
		this.events.fire('addactor', { actor });		
	}

	/**
	 * Creates a new Actor (or descendant class) instance. The instance is not added into the gameLoop. The instance will have _type and objectType properties set accordingly.
	 * @param {*} typeString Actor type to create as a string, e.g. 'player', 'enemy', etc.
	 * @param {*} o Parameters to send to the Actor (or descendant) class constructor.
	 * @returns
	 */
	createTypedActor(typeString, o) {
		let a;
		switch (typeString) {
			case 'player'      	: { a = new Player(o); const hp = new Hitpoints(); hp.assignTo(a); this.players.push(a); a._type = Enum_ActorTypes.Player; break; }
			case 'enemy' 	  	: { a = new Enemy(o);  const hp = new Hitpoints(); hp.assignTo(a); a._type = Enum_ActorTypes.Enemy; break; } 
			case 'projectile'  	: { a = new Projectile(o); a._type = Enum_ActorTypes.Projectile; break; }			
			case 'consumable'   : { a = new Actor(o); a._type = Enum_ActorTypes.Consumable; break; }
			case 'obstacle'     : { a = new Actor(o); a._type = Enum_ActorTypes.Obstacle; break; }
			case 'npc'  		: { a = new Actor(o); a._type = Enum_ActorTypes.Npc; break; }
			case 'actor'  		: { a = new Actor(o); a._type = Enum_ActorTypes.Actor; break; }
			default 	  		: { a = new aType(o); a._type = Enum_ActorTypes.Default; }
		}
		a.objectType = typeString;		
		a.renderHints.showColliders   = this.flags.showColliders;
		a.renderHints.showBoundingBox = this.flags.showBoundingBoxes;			// copy the Gameloop boundingbox state to the created actor		
		return a;
	}

	/**
	 * Creates a new game object instance and adds it in the GameLoop
	 * @param {String|Actor} aType Object type (string) to create OR add already existing descendant of Actor class which will be added in the gameLoop 
	 * @param {object} o Actor parameter object
	 * @param {string} o.name User defined name
	 * @param {image} o.img HTMLImageElement or Canvas
	 * @param {string} o.imgUrl URL to image
	 * @param {Vector2} o.position
	 * @param {Vector2} o.rotation
	 * @param {number} o.scale
	 * @param {Vector2} o.dims Image dimensions
	 * @param {boolean} o.hasColliders Image dimensions
	 * @returns {Actor|Player|Enemy|Projectile|Layer|Level}
	 */
	add(aType, o = {}) {		
		o.owner = this;

		if (aType instanceof Actor) {														// if the first parameter is an existing Actor instance...
			aType.owner = this;			

			if (!('_type' in aType)) {
				const c = aType.constructor.name;			
				if (Enum_ActorTypes[c]) aType._type = Enum_ActorTypes[c];
					else aType._type = Enum_ActorTypes.Default;
			}

			this._addActor(aType);			
			return aType;
		}

		var a;
		if (aType == 'level')  { 															// Levels are a different beast. Add them in their own container and exit.
			a = new Level(o); 
			this.levels.push(a); 
			this.events.fire('addactor', { actor:a });
			return a; 
		}
						
		if (aType == 'custom') { 
			if (!('zIndex' in o)) throw 'Custom GameLoop object must have zIndex property defined.';
			if (!AE.isFunction(o.update)) throw 'Custom GameLoop object must have update() method defined.';
			this.zLayers[o.zIndex].push(o); 
			a = o;		
		}

		if (aType == 'layer') {
			a = new Layer(o);
			a.objectType = aType;
			this.zLayers[a.zIndex].push(a);	
			return a;			
		}
					
		if (a == null) {																// Actors and its descendants
			a = this.createTypedActor(aType.toLowerCase(), o);							// create new actor type based on the given string, e.g. 'player', 'enemy', etc...			
		}

		this._addActor(a);
				
		return a;
	}

	/**
	 * DO NOT USE! This is called internally!
	 */	
	_render(timeStamp) {
		if (!this._flags.isRunning && this._oneShotRender == false) {	  		// frame processing cannot be cancelled when isRunning is false - otherwise debugger will not be able to run its injected code
			this._lastTickLen  = performance.now();
			this._frameStart   = this._lastTick;
			return;		
		}
		
		if (Engine.renderingSurface) Engine.renderingSurface.resetTransform();								// reset transform (before ticks)
		
		// --- tick ---
		const nextTick = this._lastTickLen + this._tickRate;
		this._tickQueue = 0;
		
		if (timeStamp > nextTick) {
			const timeSinceTick = timeStamp - this._lastTickLen;
			this._tickQueue     = ~~(timeSinceTick / this._tickRate);
		}
		
		if (this._tickQueue > 120) { 											// handle tick timer panic
			this._lastTickLen = performance.now(); 
			if (this.onPanic) this.onPanic(this._tickQueue);
			return; 
		}
		
		for (let i = 0; i < this._tickQueue; i++) {
			this._lastTickLen += this._tickRate;
			this._tick();
		}
		
		// --- render ---
		if (this._frameStart == null) this._frameStart = timeStamp;		
		this.frameDelta = timeStamp - this._frameStart;		
		
		if (this.clearColor) {
			if (this.clearColor == 'erase') Engine.renderingSurface.ctx.clearRect(0,0, Engine.dims.x, Engine.dims.y);			// clear
				else Engine.renderingSurface.drawRectangle(0,0, Engine.dims.x, Engine.dims.y, { fill:this.clearColor });		// clear with color
		}
		if (this.onBeforeRender) this.onBeforeRender();		
		
		for (const layer of this.zLayers) {			
			for (let i = 0; i < layer.length; i++) {				
				layer[i].update();				
			}			
		}
		
		// time delta and average fps calculations		
		this.frameTimes[this.frameCount % 30] = this.frameDelta;			
		this.frameCount++;			
		this._frameStart = timeStamp;
		this._oneShotRender = false;

		this.requestID = window.requestAnimationFrame(t => this._render(t));	// schedule next frame
	}

	removeFromZLayers(object) {
		let deleteCount = 0;
		for (const layer of this.zLayers) {
			for (let i = layer.length; i--;) if (layer[i] === object) {
				layer.splice(i, 1);
				deleteCount++;
			}
		}
		return deleteCount;
	}
	
	/**
	 * DO NOT USE! This is called internally!
	 */	
	_tick(forceSingleTick) {
		const groups = this.hitTestGroups;

		if (!this.flags.isRunning && !forceSingleTick) return;
		
		const tickStart = performance.now();
				
		// run the ticks:
		if (this.onBeforeTick) this.onBeforeTick(this.actors);
		if (this.engine.audio) this.engine.audio.tick();
		for (const t of this.tickables) t.tick();
		for (const t of this.zLayers) for (const o of t) if (o.tick) o.tick();
		
		// temp constants
		const actorsArray = this.actors;				
		const destroyed   = [];					// list for destroyed actors, collected during actor.tick() 

		/* 
			Hit testing: The idea is to reduce number of hit test by looping though actors once and putting them in their respective hit test group arrays
			This way only actor types which can interact with each other are compared
		*/
		this.overlapTests = 0;
		if (this.flags.collisionsEnabled) {						
			groups.clear();																													// clear hit test groups
			for (const actor of actorsArray) if (actor.hasColliders && !actor.flags.isDestroyed) groups[actor.colliderType].push(actor);	// put all actors in their respective groups
			this.overlaps.length = 0;														
		}

		// loop all actors in the gameloop		
		this.collisionCheckTime = 0;
		for (let i = 0; i < actorsArray.length; i++) {			
			const actor = actorsArray[i];

			actor.tick();										// tick all actors (actor.tick() returns immediately if actor is destroyed)
			
			// check for collisions and overlaps:
			const collisionCheckTime = performance.now();

			if (this.flags.collisionsEnabled && actor.flags.hasColliders && !actor.flags.isDestroyed) {
				for (const g of Object.keys(groups)) {															// loop through every hit test group
					if (actor._hitTestFlag[g] != Enum_HitTestMode.Ignore) {										// can we ignore the whole group?
						for (const o of groups[g]) {
							if (o != actor && !o.flags.isDestroyed) {				// do not test against self and destroyed actors
								this.overlapTests++;
								actor._testOverlaps(o);
								if (o.flags.isDestroyed) destroyed.push(o);
							}
						}				
					}
				}
			}
			
			this.collisionCheckTime += performance.now() - collisionCheckTime;
			
			if (actor.flags.isDestroyed) destroyed.push(actor);						
		} 	

		// take care of destroying all actors with "isDestroyed" flag set AFTER checking for collisions, because typically actors get destroyed in collisions/overlaps			
		// but the dev might have set the flag too.
		for (const a of destroyed) this.removeActor(a);

		// tick timers:
		for (let i = this.timers.length; i--;) {
			const evt = this.timers[i];

			if ('actor' in evt && evt.actor.isDestroyed) {
				this.timers.splice(i, 1);				
				continue;
			}
			
			if (!evt.isPaused) {
				if ('onTick' in evt) evt.onTick(evt); 

				evt.ticksLeft--;			
				if (evt.ticksLeft == -1) { 						
					if ('onRepeat' in evt) evt.onRepeat(evt); 					
					
					evt.ticksLeft = evt.duration;					
					evt.repeatsLeft--;							
					if (evt.repeatsLeft == -1) {
						this.timers.splice(i, 1); 
						if ('onComplete' in evt) evt.onComplete(evt); 
					}					
				}
			}
		}
		
		this.tickCount++;
		this._lastTick = performance.now() - tickStart;				
	}

	/**
	 * Pauses or resumes the GameLoop
	 */
	pause(onBeforeTick) {
		if (this.flags.isRunning) return this.stop();
		// restart 
		if (onBeforeTick) this.onBeforeTick = onBeforeTick;
		this.start();
	}
	
	/**
	 * Starts the GameLoop
	 */
	start() {
		this.flags.isRunning = true;
		
		this._lastTickLen    = performance.now();
		this._frameStart     = this._lastTick;
		
		try {			
			this._render();			
		} catch (e) {
			window.cancelAnimationFrame(this.requestID);
			console.error(e);
		}
	}

	stop() {
		window.cancelAnimationFrame(this.requestID);
		this.requestID       = null;
		this.flags.isRunning = false;
	}

	step() {
		if (this.flags.isRunning == false) {
			this._tick(true); 
			this.pause(); 
			this._oneShotRender = true; 
			this._lastTickLen   = performance.now();
			this._frameStart    = this._lastTick;
			this._render();
		}
	}

	/**
	 * Forces the engine to repaint current frame
	 */
	update() {
		this._oneShotRender = true;
		this._render();
	}

	toString() {
		return '[GameLoop]';
	}

} // class end

export { GameLoop }