/*

	three.js
	Real, matrix/vector based 3D maths, tools & utils for TGE
	Written by Ridge Batty

*/
import { Engine, Types }  from "./engine.js";

const { V3, Vector2 : Vec2, Vector : Vec3, Vector4 : Vec4, Matrix4x4 : Mat16 } = Types;

class Mesh {
	constructor(vertices, faces) {
		this.vertices = vertices;
		this.faces    = faces;
		this.normals  = [];

		for (let i = 0; i < this.faces.length / 3; i++) {
			const v0 = this.vertices[this.faces[i * 3 + 0]];
			const v1 = this.vertices[this.faces[i * 3 + 1]];
			const v2 = this.vertices[this.faces[i * 3 + 2]];

			const line1  = Vec3.Sub(v1, v0);
			const line2  = Vec3.Sub(v2, v0);
			const normal = Vec3.Cross(line1, line2).normalize();

			this.normals.push(normal);
		}
	}

	static IsCCW(v0, v1, v2) {
		return (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x) >= 0;
	}
}

class MeshCube extends Mesh {
	constructor() {
		const v = [V3(-1, -1,  1), V3(1, -1,  1), V3(1, 1,  1), V3(-1, 1,  1),
				   V3(-1, -1, -1), V3(1, -1, -1), V3(1, 1, -1), V3(-1, 1, -1)];
		const t = [0, 1, 3, 1, 2, 3,  // front
				   1, 5, 2, 5, 6, 2,  // right
				   5, 4, 6, 4, 7, 6,  // back
				   4, 0, 7, 0, 3, 7,  // left
				   4, 5, 0, 5, 1, 0,  // top
				   7, 3, 2, 7, 2, 6]; // bottom
		super(v, t);   		
	}
}

class Camera {
	constructor() {
		this.near           = 0.1;
		this.far            = 1000.0;
		this.aspectRatio    = 1 / Engine.aspectRatio;		
		this._fovAngle      = 170;														// 90 degrees fov angle
		this._fovRad        = 1 / Math.tan(this._fovAngle * 0.5 / 180 * Math.PI);
		
		const m             = Mat16.Identity();
		const frustumLength = this.far - this.near;
		
		m.setValue(0, 0, this.aspectRatio * this._fovRad);
		m.setValue(1, 1, this._fovRad);
		m.setValue(2, 2, this.far / frustumLength);
		m.setValue(2, 3, (-this.far * this.near) / frustumLength);
		m.setValue(3, 2, 1.0);
		m.setValue(3, 3, 0.0);		

		this.projMatrix = m;
		this.viewMatrix = Mat16.Identity();
	}
	
	transform(vertices) {	
		const transformed = [];
		const pvMatrix    = Mat16.Mul(this.projMatrix, this.viewMatrix);

		for (const v of vertices) {
			const vec4 = new Vec4(v.x, v.y, v.z, 1);
			const res  = pvMatrix.mulVector(vec4);

			// projection matrix
			if (res.w != 0) {
				res.x /= res.w;
				res.y /= res.w;
				res.z /= res.w;
			}
			transformed.push(new Vec2(res.x, res.y));
		}		
		return transformed;		
	}
}

export { Camera, Mesh, MeshCube }