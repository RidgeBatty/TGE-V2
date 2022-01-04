/*


	GameLoop encapsulates the basic functionality of main game loop
	

*/
import { Hitpoints } from './actor-hp.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Projectile } from './projectile.js';
import { Actor, Enum_ActorTypes } from './actor.js';
import { Layer } from './layer.js';

import { Vector2 } from './types.js';
import { Engine } from './engine.js';

class GameLoop {	
	constructor(o = {}) {
		this.engine         = 'engine' in o ? o.engine : null;
		this.data           = {};	// user data
		this._flags		    = { isRunning:false, showColliders:false, collisionsEnabled:false, showBoundingBoxes:false };
		this.flags          = Object.seal(this._flags);  // flags
		
		this.levels         = [];
		this.players        = [];	
		this.actors         = [];
		this.tickables      = [];
		this.zLayers        = [...Array(16).keys()].map(e => []);
		this.clearColor     = null;
		
		this.overlaps       = [];			// list of overlapping objects during the current frame, after overlap calculations
		
		// events:
		this.onBeforeRender = ('onBeforeRender' in o && typeof o.onBeforeRender == 'function') ? o.onBeforeRender : null; 
		this.onBeforeTick   = ('onBeforeTick' in o && typeof o.onBeforeTick == 'function') ? o.onBeforeTick : null; 
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

		this.container      = null;			// if defined, actors are created inside this container (overriding engine.rootElem)
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
	get seconds() {
		return this.tickCount / (1000 / this._tickRate);
	}

	/**
	 * 
	 * @param {object} o 
	 * @param {string=} o.name User defined name
	 * @param {number} o.duration How many ticks between 
	 * @param {number} o.repeat How many times the timer should repeat?
	 * @param {function=} o.onTick Fires on every tick
	 * @param {function=} o.onRepeat Fires when the cycle repeats
	 * @param {function=} o.onComplete Fires when the repeats are used up and the timer is destroyed
	 */
	addTimer(o) {
		if (!('repeat' in o)) o.repeat = 1;
		const timerObj = Object.assign({ ticksLeft : o.duration, repeatsLeft : o.repeat }, o);
		this.timers.push(timerObj);
	}

	/**
	 * Immediately removes all timers from GameLoop without firing any of their events
	 */
	clearTimers() {
		this.timers.length = 0;
	}
	
	/**
	 * Loops through all actors and issues a callback
	 * @param {function} cb 	 
	 */
	forActors(cb) {
		for (const actor of this.actors) cb(actor);
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

	/**
	 * Loops through all actors and returns an array of actors based on their flag values	
	 * @param {string} name 
	 * @returns {Actor}
	 */
	findActorByName(name) {		
		for (const actor of this.actors) if (actor.name == name) return actor;
		return null;
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
	 * Creates a new game object instance and adds it in the GameLoop
	 * @param {String} aType Object type to create, one of level|player|projectile|enemy|layer|consumable|obstacle|npc
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

		var a;
		if (aType == 'level')  { a = new Level(o); this.levels.push(a); return a; }			// levels are a different beast. add them in their own container and exit.
		if (aType == 'custom') { 
			if (!('zIndex' in o)) throw 'Custom GameLoop object must have zIndex property defined.';
			if (!AE.isFunction(o.update)) throw 'Custom GameLoop object must have update() method defined.';
			this.zLayers[o.zIndex].push(o); 
			a = o;		
		}
		if (aType == 'layer') a = new Layer(o);
			
		// handle Actors and its descendants:
		if (a == null) {
			switch (aType) {
				case 'player'      	: { var a = new Player(o); const hp = new Hitpoints(); hp.assignTo(a); this.players.push(a); a._type = Enum_ActorTypes.player; break; }
				case 'enemy' 	  	: { var a = new Enemy(o);  const hp = new Hitpoints(); hp.assignTo(a); a._type = Enum_ActorTypes.enemy; break; } 
				case 'projectile'  	: { var a = new Projectile(o); a._type = Enum_ActorTypes.projectile; break; }			
				case 'consumable'   : { var a = new Actor(o); a._type = Enum_ActorTypes.consumable; break; }
				case 'obstacle'     : { var a = new Actor(o); a._type = Enum_ActorTypes.obstacle; break; }
				case 'npc'  		: { var a = new Actor(o); a._type = Enum_ActorTypes.npc; break; }
				default 	  		: { var a = new Actor(o); a._type = Enum_ActorTypes.default; }
			}
			a.objectType = aType;
			this.zLayers[a.zIndex].push(a);	

			// if the GameLoop has showColliders flag enabled, make the colliders visible for all subsequently created Actors
			if ('_type' in a) {
				this.actors.push(a);			
				a.renderHints.showColliders   = this.flags.showColliders;
				a.renderHints.showBoundingBox = this.flags.showBoundingBoxes;			// copy the Gameloop boundingbox state to the created actor
			}
		}
		
		return a;
	}

	/**
	 * DO NOT USE! This is called internally!
	 */	
	_render(timeStamp) {

		// schedule frame
		this.requestID       = window.requestAnimationFrame(t => this._render(t));

		if (!this._flags.isRunning && this._oneShotRender == false) {	   // frame processing cannot be cancelled when isRunning is false - otherwise debugger will not be able to run its injected code
			this._lastTickLen    = performance.now();
			this._frameStart     = this._lastTick;
			return;		
		}

		// reset transform
		Engine.renderingSurface.resetTransform();

		// clearColor
		if (this.clearColor) Engine.renderingSurface.drawRectangle(0,0, Engine.dims.x, Engine.dims.y, { fill:this.clearColor });
		
		// tick
		const nextTick = this._lastTickLen + this._tickRate;
		this._tickQueue = 0;
		
		if (timeStamp > nextTick) {
			const timeSinceTick = timeStamp - this._lastTickLen;
			this._tickQueue     = ~~(timeSinceTick / this._tickRate);
		}
		
		if (this._tickQueue > 120) { 									// panic
			this._lastTickLen = performance.now(); 
			return; 
		}
		
		for (let i = 0; i < this._tickQueue; i++) {
			this._lastTickLen += this._tickRate;
			this._tick();
		}
		
		// render
		if (this._frameStart == null) this._frameStart = timeStamp;		
		this.frameDelta = timeStamp - this._frameStart;
				
		if (this.onBeforeRender) this.onBeforeRender();		
		
		for (const layer of this.zLayers) {			
			for (const object of layer) {
				object.update();				
			}			
		}
		
		// time delta and average fps calculations		
		this.frameTimes[this.frameCount % 30] = this.frameDelta;			
		this.frameCount++;			
		this._frameStart = timeStamp;
		this._oneShotRender = false;
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
		if (!this.flags.isRunning && !forceSingleTick) return;
		
		const tickStart = performance.now();
				
		// run the ticks:
		if (this.onBeforeTick) this.onBeforeTick(this.actors);
		for (const t of this.tickables) t.tick();
		for (const t of this.zLayers) for (const o of t) if (o.tick) o.tick();
		
		const actorsArray = this.actors;				
		const destroyed   = [];					// list for destroyed actors, collected during actor.tick() 

		if (this.flags.collisionsEnabled) {
			// reset the color of all colliders of all actors 
			//if (this.flags.showColliders) for (const actor of actorsArray) if (actor.flags.hasColliders) for (const c of actor.colliders.objects) actor.colliders._setHilite(c.elem, 'blue');			

			// create hit test groups:		
			var groups = {
				Player:[],
				Enemy:[],
				PlayerShot:[],
				EnemyShot:[],
				Obstacle:[],
				WorldStatic:[],
				WorldDynamic:[],			
				Decoration:[],
				Environment:[],
			}
			for (const actor of actorsArray) if (actor.hasColliders) groups[actor.colliderType].push(actor);					
			this.overlaps.length = 0;
		}

		// loop all actors in the gameloop		
		for (let i = actorsArray.length; i--;) {			
			const actor = actorsArray[i];

			actor.tick();										// tick all actors (actor.tick() returns immediately if actor is destroyed)
			
			// check for collisions and overlaps:
			if (this.flags.collisionsEnabled && actor.flags.hasColliders) {
				for (const g of Object.keys(groups)) {														// loop through every hit test group
					if (actor._hitTestFlag[g] < 3) {
						for (const o of groups[g]) {
							if (o != actor && !actor.flags.isDestroyed && !o.flags.isDestroyed) {				// do not test against self and destroyed actors
								actor.testOverlaps(o);
								if (o.flags.isDestroyed) destroyed.push(o);
							}
						}				
					}
				}
			}
			
			if (actor.flags.isDestroyed) destroyed.push(actor);						
		} 	

		// take care of destroying the actors AFTER checking for collisions, because typically actors get destroyed in collisions/overlaps			
		for (const actor of destroyed) {
			// signal 'endoverlap' to all actors which this actor overlaps with:
			for (const olap of actor.overlaps) {				
				olap.overlaps = olap.overlaps.filter(e => e != actor);			// remove destroyed actor from (all the) other actors' overlaps list!				
				actor._fireEvent('endoverlap', { actor, otherActor:olap });	
			}
			
			// remove from zLayers:
			this.removeFromZLayers(actor);
			
			// clean up:
			actor.release();
			this.actors = actorsArray.filter(e => e != actor);	// probably not efficient to replace the whole actors array, but rarely called					
		}

		// tick timers:
		for (let i = this.timers.length; i--;) {
			const evt = this.timers[i];
			
			if ('onTick' in evt) evt.onTick(evt); 

			evt.ticksLeft--;			
			if (evt.ticksLeft == 0) { 						
				if ('onRepeat' in evt) evt.onRepeat(evt); 					
				
				evt.repeatsLeft--;		
				evt.ticksLeft = evt.duration;
				
				if (evt.repeatsLeft == 0 && evt.ticksLeft) {
					this.timers.splice(i, 1); 
					if ('onComplete' in evt) evt.onComplete(evt); 
				}
			}
		}
		
		this.tickCount++;
		this._lastTick = performance.now() - tickStart;				
	}

	/**
	 * Pauses the GameLoop
	 */
	pause() {
		window.cancelAnimationFrame(this.requestID);
		this.requestID       = null;
		this.flags.isRunning = false;				
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

	toString() {
		return '[GameLoop]';
	}

} // class end

export { GameLoop }