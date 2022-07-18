import * as TGE from './v2/engine.js';
const Engine = TGE.Engine;	

// Your game's main execution point:
const main = async () => {        
    
    // ID of the HTML element where the game engine should draw
    Engine.setRootElement('game');                              
    
    // Actors should respect the viewport edges and Engine should create a Canvas element for rendering
    Engine.setFlags({ hasEdges:false, hasRenderingSurface:true });

    // do game stuff here...

    // start the engine
    Engine.start(tick); 
}

// Calls your custom function to start the game when init is completed
Engine.init(main);    