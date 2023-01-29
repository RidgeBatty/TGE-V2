/*

    Raytracer demo 
    TGE
    Written by Ridge Batty (c) 2022

*/
import { Engine } from "../../engine.js";
import { Raytracer } from "../../raytracer.js";

const main = async () => {    
    Engine.setup({ rootElem:'game', clearColor:'erase', flags:{ hasEdges:false, hasRenderingSurface:true } });    

    const player    = Engine.gameLoop.add('player', { controls:['keyboard'], movement:'FirstPersonShooter' });    

    const raytracer = new Raytracer({ useActor:player, addLayer:true }); 
    raytracer.createMap([
        { x:-6,  y:6, w:20, h:-20, flip:true },
        { x:1,  y:-3, w:2, h:-2 },
        { x:-3, y:-3, w:2, h:-2, textures:[1,1,1,1] },
        { x:-3, y:-6, w:2, h:-2 },
        { x:1,  y:-6, w:2, h:-2, textures:[1,1,1,1] }]);
    await raytracer.addTextures([{ url:'img/bricks1.jpg' }, { url:'img/bricks2.jpg' }]);
        
    Engine.start();
}

Engine.init(main);