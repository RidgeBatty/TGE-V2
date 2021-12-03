import * as TGE from '../../engine.js';
import { ParticleSystem, Emitter }  from '../../particles.js';
import { preloadImages, getJSON } from '../../utils.js';
const Engine = TGE.Engine;	
const { Vector2:Vec2 } = TGE.Types;

const main = async () => {    
    
    // First let's set up the engine    
    Engine.setRootElement('game');
    Engine.createRenderingSurface();

    try {
        // load cornflower image
        const images = await preloadImages({ path:'img/', urls:['cornflower.png'] });

        // create a particle system
        const particleSystem = new ParticleSystem(Engine);

        // load emitter parameters from a HJSON file
        const params = await getJSON('flower-emitter.hjson');

        // get the image from the images array which was created by preloadImages() function. Insert it into the parameters object.
        params.initParticle.img = images[0];                                                     
        
        // create an emitter
        const emitter = particleSystem.addEmitter(params);        

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