/*

    Demonstration of mathematically accurate 3D rasterizer

*/
import { Engine, Types } from "../../engine.js";
import { Rasterizer } from "../../rasterizer.js";
import { MeshCube } from "../../three.js";

const { Vector2 : Vec2, Vector : Vec3, Matrix4x4 : Mat16 } = Types;

const update = (r) => {
    r.zRot += 0.01;    
}

const main = async () => {    
    Engine.setup({ rootElem:'game', flags:{ hasEdges:false, hasRenderingSurface:true } })

    Engine.gameLoop.clearColor = '#222';
    Engine.gameLoop.tickRate = 60;

    const rasterizer = new Rasterizer();
    rasterizer.meshes.push(new MeshCube());

    Engine.addLayer(rasterizer);    
    Engine.start(_ => update(rasterizer));
}

Engine.init(main);