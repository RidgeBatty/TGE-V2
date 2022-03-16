import * as TGE from '../../engine.js';
import { ParticleSystem }  from '../../particles.js';
import { getJSON } from '../../utils.js';

const Engine = TGE.Engine;	

const spawnEmitter = (ps, name) => {
    // create an emitter
    const params  = ps.stash.get(name);                 // get the emitter params from ParticleSystem stash
    const emitter = ps.addEmitter(params);                
    
    // start the emitter and set initial position (to center of the screen)
    emitter.addEvent('complete', (e) => {
        e.instigator.destroy();
        spawnEmitter(ps, ['stars', 'triangles'][Math.floor(Math.random() * 2)]);
    })
    emitter.start();   
    emitter.position = Engine.dims.mul({ x: 0.5, y:0.75 });        
}

const main = async () => {        
    // First let's set up the engine    
    Engine.setRootElement('game');
    Engine.setFlags({ hasEdges:false, hasRenderingSurface:true });
    
    try {
        // create background actor
        Engine.gameLoop.add('actor', { imgUrl:'img/level1.jpg', scale:1.125, position:Engine.dims.mulScalar(0.5) });
        
        // create a particle system
        const ps = new ParticleSystem(Engine);

        // load emitter parameters from a HJSON file
        await ps.loadFromFile(['star-emitter.hjson','triangle-emitter.hjson']);

        spawnEmitter(ps, 'stars');

    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }

    // start the engine
    Engine.start(); 
}

Engine.init(main);