/*

    Demonstration of mathematically accurate 3D rasterizer

*/
import { Engine, Types } from "/engine.js";
import { Rasterizer } from "/rasterizer.js";
import { MeshCube } from "/three.js";

const update = (r) => {
    r.xRot += 0.01;    
    r.yRot += 0.015;    
    r.zRot += 0.02;    
}

const main = async () => {    
    await Engine.setup('./settings.hjson');

    const rasterizer = new Rasterizer();
    rasterizer.meshes.push(new MeshCube());
    
    Engine.start(_ => update(rasterizer));
}

Engine.init(main);