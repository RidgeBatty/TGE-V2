/*

	Three.js
	Pseudo/Retro 3D software renderer, tools & utils for TGE
	Written by Ridge Batty

*/
import { Engine, Types }  from "./engine.js";

const { Vector2 : Vec2, Vector : Vec3, Matrix4x4 : Mat4x4 } = Types;

class Mesh {
	constructor(vertices, faces) {
		this.vertices = vertices;
		this.faces    = faces;
	}
}

class MeshCube extends Mesh {
	constructor() {
		const v = [new Vec2(-1, -1,  1), new Vec2(1, -1,  1), new Vec2(1, 1,  1), new Vec2(-1, 1,  1),
				   new Vec2(-1, -1, -1), new Vec2(1, -1, -1), new Vec2(1, 1, -1), new Vec2(-1, 1, -1)];
		const t = [0, 1, 3, 1, 2, 3, 	// Front
				   1, 5, 2, 5, 6, 2, 	// Right
				   0, 4, 5, 5, 1, 0,	// Top
				   3, 2, 7, 2, 6, 7,	// Bottom
				   4, 0, 7, 0, 3, 7,	// Left
				   ];
		super(v, t);   		
	}
}

class Camera {
	constructor() {
		this.near = 0.1;
		this.far  = 1000.0;
		this.aspectRatio = Engine.aspectRatio;		
		this._fovRad = 1;								// 90 degrees in radians
		
		const m   = Mat4x4.Identity();
		
		m.setValue(0, 0, this.aspectRatio * this._fovRad);
		m.setValue(1, 1, this._fovRad);
		m.setValue(2, 2, this.far / (this.far - this.near));
		m.setValue(3, 2, (-this.far * this.near) / (this.far - this.near));
		m.setValue(2, 3, 1.0);
		m.setValue(3, 3, 0.0);		
		
		this.mat = m;
	}
	
	get fov() {
		return Math.atan(1 / this._fovRad) / Math.PI * 180 * 2;
	}
	
	set fov(degrees) {
		this._fovRad = 1 / Math.tan(degrees * 0.5 / 180 * Math.PI);
	}
	
	transform(mesh) {	
		
		
	}
}

export { Camera, Triangle, Mesh }