import * as TGE from './v2/engine.js';
const { Engine } = TGE;

const tick = () => {
    console.log('This code will run every tick 60 frames per second by default.')
    console.log('Be careful with performance, do not add computationally heavy operations here!');
}

const main = async () => {                      // main() will be your game's execution point
    await Engine.setup('./settings.hjson');     // Load settings from external file (this is the preferred way to set up the engine)
    
    // do your game setup/initialization stuff here...

    Engine.start(tick);                         // start the engine (with optional reference to your custom callback function, executed on every gameLoop tick)
}

Engine.init(main);                              // Calls your custom initialization function to start the game when init is completed