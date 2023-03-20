import * as TGE from '../../engine.js';
import { ParticleSystem }  from '../../particles.js';
import { getJSON } from '../../utils.js';

const Engine = TGE.Engine;	

const main = async () => {        
    // First let's set up the engine    
    await Engine.setup('../../settings.hjson');
    
    
    try {        
        Engine.gameLoop.add('actor', {                                                      // create background actor
            imgUrl:'img/level1.jpg', scale:1.125, position:Engine.dims.mulScalar(0.5) 
        });
                
        const particleSystem = new ParticleSystem(Engine);                                  // create a particle system
        const params  = await getJSON('shape-emitter.hjson');                               // load emitter parameters from a HJSON file

        params.surface = Engine.renderingSurface;
        const emitter = await particleSystem.addEmitter(params);                            // create an emitter
        
        emitter.start();                                                                    // start the emitter and set initial position (to center of the screen)
        emitter.position = Engine.dims.mulScalar(0.5);

        // set the emitter pivot position to match mouse position on every tick - effectively making the emitted particles spawn at mouse cursor
        emitter.addEvent('tick', e => { 
            e.instigator.pivot = Engine.mousePos;             
        })        
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }

    // start the engine
    Engine.start(); 
}

Engine.init(main);