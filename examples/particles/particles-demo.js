import * as TGE from '../../engine.js';
import { ParticleSystem, Emitter }  from '../../particles.js';
import { preloadImages, getJSON } from '../../utils.js';
import Debug from '../../tools/debug.js';

const Engine = TGE.Engine;	
const { Vector2:Vec2 } = TGE.Types;

const main = async () => {    
    
    // First let's set up the engine    
    Engine.setRootElement('game');
    Engine.createRenderingSurface();

    try {
        // load cornflower image and background
        const images = await preloadImages({ path:'img/', urls:['clouds.jpg'] });

        Engine.gameLoop.add('actor', { img:images[0], scale:1.125, position:new Vec2(576, 330) });

        // create a particle system
        const particleSystem = new ParticleSystem(Engine);

        // load emitter parameters from a HJSON file
        const params = await getJSON('flower-emitter.hjson');
        
        // create an emitter
        const emitter = particleSystem.addEmitter(params);                
        emitter.analyze(params);

        // rotate the emitter on every tick (default 60/sec)
        emitter.addEvent('tick', (e) => { e.instigator.angle += 0.004 });

        // start the emitter
        emitter.start();    

        console.log('Particle system loaded');
    } catch (e) {
        console.log('Failed to load & run particle system!');
        console.log(e);
        return;
    }

    // start the engine
    Engine.start(); 
}

main();