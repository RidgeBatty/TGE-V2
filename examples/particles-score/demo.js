/*

    Particles Score Demo
    ====================
    Ten ship actors are created. Each ship has Circle collider attached which acts a click target area.
    Click on the actors to destroy them and spawn floating score particles at the location.

*/
import { Engine, Types } from '../../engine.js';
import { ParticleSystem }  from '../../particles.js';
import { getJSON } from '../../utils.js';
import { Circle } from '../../physics.js';

const { Vector2:Vec2, Rect } = Types;

// Handle actor click event
const onClickActor = (e) => {    
    const actor = e.instigator;
    const p = actor.position;
    actor.destroy();

    const emitter  = Engine.gameLoop.particleSystems[0].emitterByName('score');
    const particle = emitter.spawn(true);

    // subtract half of the viewport dimensions, because emitter is in the middle of the viewport
    particle.position = Vec2.Sub(p, Engine.dims.mulScalar(0.5)); 
    particle.textContent = Math.floor((0.1 + Math.random()) * 10) + '00';    
}

const main = async () => {    
    await Engine.setup('../../settings.hjson');
    
    try {        
        const layer = Engine.addLayer({ imgUrl:'img/level1.jpg' });        

        //Engine.gameLoop.flags.showColliders = true;                                                                                           // Uncomment this line if you want to see the colliders!

        for (let i = 0; i < 10; i++) {
            const ship = Engine.addActor('actor', { imgUrl:'img/spaceship.png', scale:0.125, rotation:Math.PI });   
            ship.position.set(Vec2.Random().mul(Engine.dims));
            
            // actor needs to have mouse events and colliders enabled!
            ship.flags.mouseEnabled = true;                                 
            ship.hasColliders = true;
            
            ship.colliders.add(new Circle(Vec2.Zero(), 256));                                                                   // add a collider (to act as a mouse click target)            
            ship.events.add('click', (e) => onClickActor(e));                                                                         // add the click event handler            
        }      
        
        const particleSystem = new ParticleSystem(Engine);                                                                                       // create a particle system        
        const params = await getJSON('score-emitter.hjson');                                                                                // load emitter parameters from a HJSON file        

        const emitter = await particleSystem.addEmitter(params);                                                                                       // create an emitter
        //emitter.analyze(params);        
        emitter.start();                                                                                                                         // start the emitter and set initial position (to center of the screen)
        emitter.position = Engine.dims.mulScalar(0.5);                                                                                        // place the emitter in the middle of the screen
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }

    // start the engine
    Engine.start(); 
}

Engine.init(main);