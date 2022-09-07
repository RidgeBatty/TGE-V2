import * as TGE from './v2/engine.js';
const Engine = TGE.Engine;	

// Your game's main execution point:
const main = async () => {    
/* 
 * ID of the HTML element where the game engine should draw
 * hasEdges:Actors should respect the viewport edges.
 * hasRenderingSurface: Engine should create a Canvas element for rendering
 */
    Engine.setup({ rootElem:'game', flags:{ hasEdges:false, hasRenderingSurface:true } });    
    
    // do your game stuff here...

    Engine.start(tick);             // start the engine (with optional reference to your custom callback function, executed on every gameLoop tick)
}

// Calls your custom initialization function to start the game when init is completed
Engine.init(main);    