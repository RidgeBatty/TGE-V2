# Docs

Here are some good practices for setting up and building your TGE game.

## Primer

Basic structure of a TGE game main file may look something like this:

```
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
```

## Changing levels/ending a game

To pause the game loop, including all timers, particles, animations and actors, etc.
```
GameLoop.pause();     
```

Another option is to keep things happening and only disable collisions:
```
GameLoop.flags.collisionsEnabled = false;
```




