/**
 * 
 *  Custom particle shapes demo
 * 
 */

import * as TGE from '../../engine.js';
import { ParticleSystem }  from '../../particles.js';
import { getJSON } from '../../utils.js';

const Engine = TGE.Engine;	
const Vec2   = TGE.Types.Vector2;

const main = async () => {        
    // First let's set up the engine    
    Engine.setRootElement('game');
    Engine.setFlags({ hasEdges:false, hasRenderingSurface:true });
    
    try {        
        Engine.gameLoop.add('actor', { imgUrl:'img/level1.jpg', scale:1.125, position:Engine.dims.mulScalar(0.5) });                // create background actor
                
        const particleSystem = new ParticleSystem(Engine);                                                                                       // create a particle system        
        const params = await getJSON('shape-emitter.hjson');                                                                                // load emitter parameters from a HJSON file        

        const emitter = particleSystem.addEmitter(params);                                                                                       // create an emitter
        emitter.analyze(params);        
        emitter.start();                                                                                                                         // start the emitter and set initial position (to center of the screen)
        emitter.position = Engine.dims.mulScalar(0.5);

        // set the emitter pivot position to match mouse position on every tick - effectively making the emitted particles spawn at mouse cursor
        let rotSpeed   = 0.005;
        let gravityPos = new Vec2(0, 200);
        emitter.evolveGravity.position = gravityPos;

        emitter.addEvent('tick', e => { 
            const emitter = e.instigator;
            emitter.pivot = Engine.mousePos;            
            emitter.evolveGravity.position.rotate(rotSpeed);            
        });

        // Create and add a custom renderlayer and draw a crosshair at the gravity position
        const update = () => {            
            Engine.renderingSurface.resetTransform();   
            const g = gravityPos.clone().add(emitter.position);                 
            Engine.renderingSurface.drawLine(Vec2.Sub(g, { x:0, y:10 }),Vec2.Add(g,{ x:0, y:10 }),{ stroke:'lime' });    
            Engine.renderingSurface.drawLine(Vec2.Sub(g, { x:10, y:0 }),Vec2.Add(g,{ x:10, y:0 }),{ stroke:'lime' });    
        }                
        Engine.gameLoop.add('custom', { update, zIndex:2 });

    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }

    // start the engine
    Engine.start(); 
}

Engine.init(main);