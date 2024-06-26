 /**
 @module root
 @author Ridge Batty
 @desc
	Root

	This class is the ancestor class for stuff which is 
	- displayed on the screen 
	- may be connected to a GameLoop and/or World objects
	- may collide with other stuff
		
*/
import { Collider } from './collider.js';
import * as Types from './types.js';	
import { TNode } from './tnode.js';
import { addPropertyListener, sealProp } from './utils.js';

const Vec2 = Types.Vector2;

class Transform {
	constructor(position = Vec2.Zero(), rotation = 0, scale = 1) {
		Object.assign(this, { position, rotation, scale });		
	}

	asString(precision = 2, names = ['', '', '']) {		
		return `${names[0]}${this.position.asString(precision)}\r\n${names[1]}${this.rotation.toFixed(precision)}\r\n${names[2]}${this.scale.toFixed(precision)}`;
	}
}

/**
 * @typedef HitTestMode
 * @property {number} Overlap "1"
 * @enum {HitTestMode}
 */
const Enum_HitTestMode = {
	Ignore  : 0,				// ignore hit testing altogether. does not fire any events
	Overlap : 1,				// allow actors to overlap/pass through each other. fire beginoverlap and endoverlap events
	Block   : 2,				// do not allow overlapping. collide actors. fire collide event
}

/**
 * @typedef HitTestFlag
 * @property {string} Player "player"
 * @enum {HitTestFlag}
 */
const HitTestFlag = {
	Player:			Enum_HitTestMode.Overlap,
	Enemy:			Enum_HitTestMode.Overlap,
	PlayerShot:		Enum_HitTestMode.Overlap,
	EnemyShot:		Enum_HitTestMode.Overlap,
	Consumable:		Enum_HitTestMode.Overlap,
	Obstacle:		Enum_HitTestMode.Block,
	WorldStatic:	Enum_HitTestMode.Block,
	WorldDynamic:	Enum_HitTestMode.Block,			
	Decoration:   	Enum_HitTestMode.Ignore,
	Environment:   	Enum_HitTestMode.Ignore,
}
	
/**
 	@desc Root class for Objects which have a transform and collisions	
 */
class Root extends TNode {
	/**	
	 * @param {Object} [o={}] Parameters object 
	 * @param {GameLoop} o.owner Gameloop which owns this Root object	 
	 */
	constructor(o = {}) {		
		super(o);
		
		this.owner        = o.owner;		
		this.createParams = Object.assign({}, o);
		this.createParams.toString = function(){ return '[RootCreateParams]' };
						
		this.data         = ('data' in o) ? o.data : {}; // user data			
		this.renderHints  = { showColliders:false };
		this.flags        = { hasColliders:false };

		/**
		 * @type {Collider} Collider object
		 */
		this.colliders    = null;  		// collider object			
		this.overlaps     = [];			// this actor is currently overlapping all the other actors in the list
		
		this._defaultColliderType = o.colliderType ? o.colliderType : 'WorldDynamic';	// override in descendant class to change the default		

		sealProp(this, 'name', ('name' in o) ? o.name : '');					
		
		this._createCollisionChannels();

		addPropertyListener(this.flags, 'hasColliders', e => {
			if (e === true) {
				this._enableColliders();				
			} else {
				this.colliders = null;
			}			
		});

		if ('hasColliders' in o) this.flags.hasColliders = o.hasColliders;					// get colliders flag state from create parameters		       
	}
	
	get world() {
		return this?.engine?.world;
	}

	get hitTestFlag() {
		return this._hitTestFlag;
	}
	
	_createCollisionChannels() {
		this._hitTestGroup = this._defaultColliderType;				
		this._hitTestFlag  = Object.assign({}, HitTestFlag);
	}
	
	_enableColliders() {	
		if (this.colliders != null) return;
		this.colliders = new Collider({ owner:this });
		this._createCollisionChannels();		
	}
	
	get colliderType() {
		return this._hitTestGroup;
	}
	
	set colliderType(name) {
		if (name in this._hitTestFlag) this._hitTestGroup = name;			
			else throw 'Invalid ColliderType "' + String(name) + '".';
	}
	
	/**
	 * How this actor should interact with "otherActor" when collision occurs?
	 * @param {Actor} otherActor An instance of Actor class
	 */
	getCollisionResponse(otherActor) {
		return this._hitTestFlag[otherActor._hitTestGroup];		
	}
	
	/**
	 * @desc Sets current collision response for this Actor. Example: actor.setCollisionResponse('Player', Enum_HitTestMode.Overlap);
	 * @param {HitTestFlag} channelName string: Player, Enemy, PlayerShot, EnemyShot, Obstacle, WorldStatic, WorldDynamic, Decoration, Environment 
	 * @param {HitTestMode} response property of Enum_HitTestMode: Overlap, Block, Ignore
	 * 
	 */
	setCollisionResponse(channelName, response) {		
		if (channelName in this._hitTestFlag && Object.values(Enum_HitTestMode).indexOf(response) > -1) {
			this._hitTestFlag[channelName] = response;
		}
			else console.warn('Invalid parameters');
	}

	setCollisionResponseFlag(obj) {
		for (const [k, v] of Object.entries(obj)) {
			if (!(k in this._hitTestFlag)) throw 'Invalid collision response channel name';
			if (!(v in Object.values(Enum_HitTestMode))) throw 'Invalid collision response mode';
			this._hitTestFlag[k] = v;			
		}
	}

	set collisionResponseDefault(response) {
		for (const channel of Object.keys(this._hitTestFlag)) {
			this._hitTestFlag[channel] = response;
		}
	}
}

export { Root, TNode, Enum_HitTestMode, HitTestFlag, Transform }