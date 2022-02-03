# Docs

Here are some good practices to setting up and building your TGE game.

## Primer

Basic structure of a TGE game main file:

```
import * as TGE from '../../engine.js';
const Engine = TGE.Engine;	

// your games main execution point:
const main = async () => {        

    // First let's set up the engine        
    Engine.setRootElement('game');              
    Engine.setFlags({ hasEdges:false, hasRenderingSurface:true });

    // do game stuff here...

    // start the engine
    Engine.start(tick); 
}

Engine.init(main);    // calls your function to start the game
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




