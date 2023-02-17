/*

	Basic geometric shapes and their visualization methods
	For visualization the shapes can use user provided canvas element or World.canvas (if World object is available).

*/

import * as Types from './types.js';		

const Vec2 = Types.Vector2;

class Polygon {
	static Star(innerRadius, outerRadius, gram = 5) {
		const inner = new Vec2(0, innerRadius);
		const outer = new Vec2(0, outerRadius);

		const points = [];
		for (let i = 0; i < gram; i++) {                        
			const angle = Math.PI * 2 / gram * i;
			let a = inner.clone().rotate(angle - Math.PI / (gram * 2));
			let b = outer.clone().rotate(angle + Math.PI / (gram * 2));
			points.push(...[a, b]);                    
		}
		
		return points;
	}

	static Ngon(corners, scale = 1) {
		const v = new Vec2(0, scale);
		
		const points = [];
		for (let i = 0; i < corners; i++) {                        
			const angle = Math.PI * 2 / corners * i;
			let a = v.clone().rotate(angle + Math.PI / (corners * 2));			
			points.push(a);
		}
		
		return points;
	}

	static Ring(innerRadius, outerRadius, corners)  {
		const inner = new Vec2(0, innerRadius);
		const outer = new Vec2(0, outerRadius);

		const a = [], b = [];
		for (let i = 0; i < corners; i++) {                        
			const angle = Math.PI * 2 / corners * i;
			const p1 = inner.clone().rotate(angle + Math.PI / (corners * 2));
			const p2 = outer.clone().rotate(-angle + Math.PI / (corners * 2));
			a[i] = p1;
			b[i] = p2;
		}
		
		return { a, b };
	}

	static Triangle(scale) {		
		return [new Vec2(-1, 1).mulScalar(scale), new Vec2(1, 1).mulScalar(scale), new Vec2(0, -1).mulScalar(scale)];		
	}
}

export { Polygon } 