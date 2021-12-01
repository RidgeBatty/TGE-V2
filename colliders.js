/*
	
	Colliders
	Tiny Game Engine
	Written by Ridge Batty (c) 2020
	
	Exposes Collider object, a collection of PhysicsShapes, which can be attached to actors.
	Collider provides debug visualizations to PhysicsShapes. These are not meant to be used in production.

*/
import { Actor, Scene, Engine } from './engine.js';
import { Types, PhysicsShape, Circle, AABB, Box, Enum_PhysicsShape } from './physics.js';

const Vector2 = Types.Vector2;


class Collider {
	/*
	
		Do not create instances of Collider! Set Actor.hasColliders = true (inherited from Root) to enable use of colliders.
		
	*/
	constructor(o) {
		if ('owner' in o) {
			if ( !(o.owner instanceof Actor || o.owner instanceof Scene)) throw 'Collider owner must be either an Actor or Scene component';
			this.actor = o.owner;
		} else { // we don't actually need an owner, we just need these properties for the collider
			this.actor = {	
				position : o.position,
				pivot    : o.pivot,
				scale    : o.scale,
			}
		}
		
		this.overlapInfo = null;		
		AE.sealProp(this, 'objects', []);
	}
	
	destroy() {
		this.removeVisuals();
		this.objects = [];
	}
	
	add(p) {		// p : PhysicsShape
		this.objects.push(p);
		p.owner = this.actor;
	}
	
	/*
		Updates the collider visualizations. If required HTML and SVG elements do not exist, they will be created.
	*/
	show() {		
		const colliders = this.objects;
		const actor     = this.actor;
		
		for (var i = 0; i < colliders.length; i++) {
			var c  = colliders[i];			
			var cp = c.position;
						
			switch (c.type) {				
				case Enum_PhysicsShape.Poly:
					if (c.elem == null) {
						var elem = Engine.addSVG(null, 'polygon');
						for (var j = 0; j < c.points.length; j++) {
							var point = Engine._svg.createSVGPoint();
							point.x = c.points[j].x;
							point.y = c.points[j].y;						
							elem.points.appendItem(point);
						}
						elem.setAttribute('class', 'tge-collider-blue');
					} else var elem = c.elem;
																
					var ang1      = actor.rotation / Math.PI * 180;
					var ang2      = c.angle / Math.PI * 180;
					var translate = (actor.position.x) + ',' + (actor.position.y); 
					var pivot     = (actor.pivot.x + c.position.x) + ',' + (actor.pivot.y + c.position.y); 
					var scale     = actor.scale;					
					elem.setAttribute('transform', `translate(${translate}) scale(${scale}) rotate(${ang1}) translate(${pivot}) rotate(${ang2})`);
				break;
				case Enum_PhysicsShape.Box:
					if (c.elem == null) var elem = AE.newElem(Engine._rootElem, 'div', 'tge-collider-bg-blue');
						else var elem = c.elem;
																
					var p 	  = actor.position.clone();					
					var px    = p.x - c.size.x / 2;
					var py    = p.y - c.size.y / 2;									
					
					var ang1  = 'rotate(' + actor.rotation + 'rad)';
					var ang2  = 'rotate(' + c.angle + 'rad)';
					var trans = 'translate(' + px + 'px,' + py + 'px)'; 
					var pivot = 'translate(' + (actor.pivot.x + c.position.x) + 'px,' + (actor.pivot.y + c.position.y) + 'px)'; 
					var scale = 'scale(' + actor.scale + ')';					
					var str   = trans + scale + ang1 + pivot + ang2;
					
					AE.style(elem, `transform:${str}; width:${c.size.x}px; height:${c.size.y}px;`);
				break;
				case Enum_PhysicsShape.AABB: 					
					if (c.elem == null) var elem = AE.newElem(Engine._rootElem, 'div', 'tge-collider-bg-blue');
						else var elem = c.elem;
					var sx   = c.size.x * 0.5;
					var sy   = c.size.y * 0.5;	
					var x    = (actor.position.x + actor.pivot.x) + cp.x - sx;
					var y    = (actor.position.y + actor.pivot.y) + cp.y - sy;
												
					AE.style(elem, AE.build('transform:translate(?px, ?px); width:?px; height:?px;', [x, y, sx * 2, sy * 2]));				
				break;
				case Enum_PhysicsShape.Circle:
					if (c.elem == null) {
						var elem = AE.newElem(Engine._rootElem, 'div', 'tge-collider-bg-blue');
						AE.style(elem, 'border-radius:50%');
					}
						else var elem = c.elem;
						
					var p 	  = actor.position.clone();
					var px    = p.x - c.radius;
					var py    = p.y - c.radius;
					
					var ang1  = 'rotate(' + actor.rotation + 'rad)';
					var ang2  = 'rotate(' + c.angle + 'rad)';
					var trans = 'translate(' + px + 'px,' + py + 'px)'; 
					var pivot = 'translate(' + (actor.pivot.x + c.position.x) + 'px,' + (actor.pivot.y + c.position.y) + 'px)'; 
					var scale = 'scale(' + actor.scale + ')';					
					var str   = trans + scale + ang1 + pivot + ang2;
					
					AE.style(elem, `transform:${str}; width:${c.radius * 2}px; height:${c.radius * 2}px;`);
				break;
			}
			c.elem = elem;
		}
	}
	
	/*
		Removes all visualizations (HTML and SVG Elements) of this Actor
		This does not destroy the Collider objects!
	*/
	removeVisuals() {
		const colliders = this.objects;
		
		for (var i = 0; i < colliders.length; i++) {
			var c = colliders[i];
			if (c.elem != null && c.elem instanceof HTMLElement) {
				AE.removeElement(c.elem);
				c.elem = null;
			}
		}
	}	
		
	/*
		Checks whether this Actor's colliders overlap with otherActor's colliders
	*/
	resolveOverlap(otherActor) {
		const otherColliders = otherActor.colliders.objects;
		const colliders      = this.objects;		
		const actor          = this.actor;
		
		// start calculating the final velocity of the actor!			
		//var velo   = Vector2.Zero();				
		var result = false;		
		
		const aResp = actor.getCollisionResponse(otherActor);
		const bResp = otherActor.getCollisionResponse(actor);
		
		// Hit testing -->
		// BLOCK: If and only if both actors have "block" flag set against each other.		
		if (aResp == 2 && bResp == 2) {				
			for (const a of colliders) for (const b of otherColliders) PhysicsShape.Collide(a, b);				
		} else {
			// OVERLAP:
			if (aResp < 3 && bResp < 3) {					
				for (const c of colliders)      c.isOverlapped = false;
				for (const c of otherColliders) c.isOverlapped = false;				
				
				for (const a of colliders) if (a.isEnabled) for (const b of otherColliders) if (b.isEnabled && PhysicsShape.Overlaps(a, b)) {
					result = true;
					if (actor.renderHints.showColliders || actor.owner.flags.showColliders) {
						this._setHilite(a.elem, 'red');					
						this._setHilite(b.elem, 'red');						
					}
					a.isOverlapped = true;
					b.isOverlapped = true;
				}					
			}
		}		
		
		return result;
	}
	
	/*
		Test if Screen Space point is inside the actor's colliders
	*/
	isPointInside(p) {		
		for (const o of this.objects) if (o.isPointInside(p)) return true;
		return false;
	}
	
	_setHilite(elem, overlap) {				
		if (elem == null) return;
		if (elem instanceof SVGElement) elem.setAttribute('class', 'tge-collider-' + overlap);
			else elem.setAttribute('class', 'tge-collider-bg-' + overlap);
	}
}

export { Collider }