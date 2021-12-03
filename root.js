/**
 @module root
 @author Ridge Batty
 @desc
	Root
	This class is the ancestor class for Actor or Scene
	it may optionally contain colliders collection
		
*/
import * as Colliders from "./colliders.js";
import * as Types from './types.js';	

const Vector2 = Types.Vector2;

const Enum_HitTestMode = {
	Overlap : 1,				// allow actors to overlap/pass through each other. fire beginoverlap and endoverlap events
	Block   : 2,				// do not allow overlapping. collide actors. fire collide event
	Ignore  : 3					// ignore hit testing altogether. does not fire any events
}
	
/**
 	@desc Root class for Objects which have a transform and collisions
 */
class Root {
	constructor(o = {}) {
		if ('scale' in o && !AE.isNumeric(o.scale)) throw 'Parameter "scale" must be a Number';
		
		this.owner        = o.owner;		
		this.createParams = o;
				
		this.position     = ('position' in o) ? o.position : Vector2.Zero();
		this.rotation     = ('rotation' in o) ? o.rotation : 0;		
		this.scale        = ('scale' in o) ? o.scale : 1;		
		
		this.velocity     = Vector2.Zero();		
		this.pivot		  = Vector2.Zero(); // middle of the bounding box
		
		this.data         = ('data' in o) ? o.data : {}; // user data	
		this.flags        = { hasColliders:false };
		this.renderHints  = {};
				
		this.world        = null;		
		this.colliders    = null;  		// colliders object			
		this.overlaps     = [];			// this actor is currently overlapping all the other actors in the list
		
		this._defaultColliderType = 'WorldDynamic';	// override in descendant class to change the default		

		AE.sealProp(this, 'name', ('name' in o) ? o.name : '');	
	}
	
	_createCollisionChannels() {
		this._hitTestGroup = this._defaultColliderType;				
		this._hitTestFlag  = {
			Player:			Enum_HitTestMode.Overlap,
			Enemy:			Enum_HitTestMode.Overlap,
			PlayerShot:		Enum_HitTestMode.Overlap,
			EnemyShot:		Enum_HitTestMode.Overlap,
			Obstacle:		Enum_HitTestMode.Block,
			WorldStatic:	Enum_HitTestMode.Block,
			WorldDynamic:	Enum_HitTestMode.Block,			
			Decoration:   	Enum_HitTestMode.Ignore,
			Environment:   	Enum_HitTestMode.Ignore,
		};				
	}
	
	get hasColliders() { return this.flags.hasColliders; }		
	set hasColliders(value) {		
		if (value === true && this.flags.hasColliders == false) {
			this.colliders = new Colliders.Collider({ owner:this });
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
	
	setCollisionResponse(flagName, response) {
		if (flagName in this._hitTestFlag && Object.values(Enum_HitTestMode).indexOf(response) > -1) this._hitTestFlag[flagName] = response;
			else console.warn('Invalid parameters');
	}
}

export { Root, Enum_HitTestMode }