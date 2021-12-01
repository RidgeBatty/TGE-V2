/*

	This class is a lightweight attachment to an Actor.
	It allows for multiple images to be displayed per actor (for example, to enable skeletal animations)
	Written by Ridge Batty (c) 2021
	
*/
import * as Types from './types.js';	

const Vector2 = Types.Vector2;

class ChildActor {
	constructor(owner, o) {
		if ( !AE.isInstanceOf(owner, 'Actor') ) {
			throw 'Fatal error: ChildActor owner must be an Actor';
		}
		this.owner        = owner;
		this.position     = ('position' in o) ? o.position : Vector2.Zero();
		this.rotation     = ('rotation' in o) ? o.rotation : 0;
		this.scale        = ('scale' in o) ? o.scale : 1;		
		
		AE.sealProp(this, 'data', {});
		
		if ('elemType' in o) this.createElem(o.elemType, o.className);
		
		this.flipbook     = null;
		this.name		  = ('name' in o) ? o.name : '';
	}
	
	/*
		Creates an HTML element for this child actor and parents it to the owner actor
	*/	
	createElem(elemType, className) {
		this.elem = AE.newElem(this.owner.elem, elemType, className);
	}
	
	update() {
		if (this.flipbook) this.flipbook.update();								// select a frame from a flipbook if the actor has one specified			
	}	
}

export { ChildActor }