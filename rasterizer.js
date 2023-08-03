/*
    rasterizer.js
    Tiny Game Engine
    3D Software Rasterizer
    Written by Ridge Batty (c) 2022

    Usage: add as a new layer in the GameLoop using Engine.addLayer()

    TO-DO: Camera/view matrix is incomplete, it doesn't rotate the camera, it rotates the mesh

*/
import { Engine, Types } from "./engine.js";
import { Layer } from "./layer.js";
import { Camera, Mesh } from "./three.js";
import { Vector } from "./types.js";

const { Matrix4x4 : Mat4x4, V2 } = Types;

class Rasterizer extends Layer {
    constructor(meshes) {
        super({});

        this.camera  = new Camera();
        this.surface = Engine.renderingSurface;                

        this.meshes  = meshes != undefined ? meshes : [];                       // add your meshes here!

        this.xRot = 0;
        this.yRot = 0;
        this.zRot = 0;

        console.log(this.camera)
    }

    update() {                
        this.surface.resetTransform();                
        
        const rmx = Mat4x4.Identity().setRotationX(this.xRot);
        const rmy = Mat4x4.Identity().setRotationY(this.yRot);
        const rmz = Mat4x4.Identity().setRotationZ(this.zRot);
        
        this.camera.viewMatrix = rmx.mul(rmy).mul(rmz);                           // rotate camera        
        this.camera.viewMatrix.addTranslation(new Vector(0,0,-5));                // translate camera
        
        for (const mesh of this.meshes) {
            const points  = this.camera.transform(mesh.vertices);
            
            let projectedPoints = [];
            for (const p of points) {
                const vx = p.x * Engine.dims.x;
                const vy = p.y * Engine.dims.y;
                const proj = V2(vx, vy).add(Engine.dims.mulScalar(0.5));            
                projectedPoints.push(proj);            
            }

            for (let i = 0; i < mesh.faces.length / 3; i++) {
                const v0 = projectedPoints[mesh.faces[i * 3 + 0]];
                const v1 = projectedPoints[mesh.faces[i * 3 + 1]];
                const v2 = projectedPoints[mesh.faces[i * 3 + 2]];

                if (Mesh.IsCCW(v0, v1, v2)) this.surface.drawPoly([v0, v1, v2], { stroke:'red'});
            }
        }
    }    
}

export { Rasterizer }
