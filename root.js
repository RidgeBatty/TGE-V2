/**
 @module root
 @author Ridge Batty
 @desc
	Root
	This class is the ancestor class for Actor or Scene
	it may optionally contain colliders collection
		
*/
import { Collider } from "./collider.js";
import * as Types from './types.js';	
import { TNode } from './tnode.js';

const Vector2 = Types.Vector2;

/**
 * @typedef HitTestMode
 * @property {number} Overlap "1"
 * @enum {HitTestMode}
 */
const Enum_HitTestMode = {
	Overlap : 1,				// allow actors to overlap/pass through each other. fire beginoverlap and endoverlap events
	Block   : 2,				// do not allow overlapping. collide actors. fire collide event
	Ignore  : 3					// ignore hit testing altogether. does not fire any events
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
	 * @param {Vector2} o.position Position of the Root
	 */
	constructor(o = {}) {		
		super(o);
		
		this.owner        = o.owner;		
		this.createParams = Object.assign({}, o);
		this.createParams.toString = function(){ return '[ActorCreateParams]' };
						
		this.data         = ('data' in o) ? o.data : {}; // user data	
		this.flags        = { hasColliders:false };
		this.renderHints  = { showColliders:false };
				
		this.world        = null;		

		/**
		 * @type {Collider} Collider object
		 */
		this.colliders    = null;  		// collider object			
		this.overlaps     = [];			// this actor is currently overlapping all the other actors in the list
		
		this._defaultColliderType = o.defaultColliderType ? o.defaultColliderType : 'WorldDynamic';	// override in descendant class to change the default		

		AE.sealProp(this, 'name', ('name' in o) ? o.name : '');			
	}
	
	_createCollisionChannels() {
		this._hitTestGroup = this._defaultColliderType;				
		this._hitTestFlag  = Object.assign({}, HitTestFlag);
	}
	
	get hasColliders() { return this.flags.hasColliders; }		
	set hasColliders(value) {		
		if (value === true && this.flags.hasColliders == false) {
			this.colliders = new Collider({ owner:this });
			this._createCollisionChannels();
			this.flags.hasColliders = true;
		}
	}
	
	get colliderType() {
		return this._hitTestGroup;
	}
	set colliderType(name) {
		if (name in this._hitTestFlag) this._hitTestGroup = name;			
			else throw 'Invalid ColliderType "' + String(name) + '".';
	}
	
	/*
		How this actor should interact with "otherActor" when collision occurs
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
		if (channelName in this._hitTestFlag && Object.values(Enum_HitTestMode).indexOf(response) > -1) this._hitTestFlag[channelName] = response;
			else console.warn('Invalid parameters');
	}
}

export { Root, Enum_HitTestMode }