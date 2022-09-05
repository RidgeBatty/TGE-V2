/*

	Curves
	Tiny Game Engine
    Interpolation functions and utils
	Written by Ridge Batty (c) 2021	
	
*/
import * as Types from './types.js';
const Vec2 = Types.Vector2;

const lerp = (start, end, n) => {
	return (1 - n) * start + n * end;
}

const lerp3 = (p0, p1, p2, t) => {
	const l1 = lerp(p0, p1, t);
	const l2 = lerp(p1, p2, t);
	return lerp(l1, l2, t);
}

const smoothstep = (e0, e1, x) => {	
	const n = AE.clamp((x - e0) / (e1 - e0), 0, 1); 	
	return n ** 2 * (3 - 2 * n);
}

const smootherstep = (e0, e1, x) => {	
	const n = AE.clamp((x - e0) / (e1 - e0), 0, 1); 	
	return n ** 3 * (n * (6 - 15 * n) + 10);
}

const colorLerp = (s, t, n) => {
	return { r:lerp(s.r, t.r, n), g:lerp(s.g, t.g, n), b:lerp(s.b, t.b, n) };
}

/*
	Creates a Catmull-Rom spline which passes through "points".
*/
const smoothPoints = (points, stepsPerCurve, tension = 1) => {		// points:[Vector2|Vector|Vector4], stepsPerCurve:Number, ?tension:Number=1
	const result = [];
		
	for (let i = 0; i < points.length - 1; i++) {				
		let prev     = (i == 0) ? points[i].clone() : points[i - 1].clone();
		let curStart = points[i].clone();
		let curEnd   = points[i + 1].clone();
		let next     = (i == points.length - 2) ? points[i + 1].clone() : points[i + 2].clone();
		
		for (let step = 0; step < stepsPerCurve; step++) {
			let t = step / stepsPerCurve;
            let tSquared = t * t;
            let tCubed   = tSquared * t;
 
            let p1 = prev.clone().mulScalar(-.5 * tension * tCubed + tension * tSquared - .5 * tension * t);
			let p2 = curStart.clone().mulScalar(1 + .5 * tSquared * (tension - 6) + .5 * tCubed * (4 - tension));
			let p3 = curEnd.clone().mulScalar(.5 * tCubed * (tension - 4) + .5 * tension * t - (tension - 3) * tSquared);
			let p4 = next.clone().mulScalar(-.5 * tension * tSquared + .5 * tension * tCubed);
 
			const p = p1.add(p2, p3, p4);    
			
			result.push(p);
		}		
	}	
	
	return result;
}

export {
    lerp, 
	lerp3, 
	smoothstep,
	smootherstep,
	colorLerp, 
    smoothPoints,
}