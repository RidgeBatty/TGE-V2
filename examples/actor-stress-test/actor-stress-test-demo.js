 /*

   Actor Stress Test Demo

   Automatically keep adding more actors on the screen until FPS drops below 60 

*/
import * as TGE from '../../engine.js';
import Debug from '../../tools/debug.js';
import { preloadImages } from '../../utils.js';
import { CanvasSurface } from '../../canvasSurface.js';

const Engine = TGE.Engine;	
const { Vector2:Vec2 } = TGE.Types;
let ass, image;

const tick = () => {    
    
    if (Engine.getFPS() >= 60) {
        // if frame rate is at 60fps, create a new actor at random spot on the screen and give it random velocity
        const index    = Math.floor(Math.random() * 3) + 1;
        const position = Vec2.Add(Vec2.Random().mul(Engine.dims.sub(new Vec2(32, 32))), new Vec2(16, 16));
        const asteroid = Engine.addActor('actor', { name:'asteroids', img:image, position });
        asteroid.velocity = Vec2.RandomDir();
        asteroid.rotation = Vec2.RandomDir().toAngle();
        asteroid.scale    = 0.1 + Math.random() * 0.1;
        asteroid.data.angularSpeed = (Math.random() - 0.5) * 0.1;

        // check for bounds and make the asteroid bounce off from screen edges
        asteroid.addEvent('tick', (a) => { 
            const actor = a.instigator;
            if (actor.position.y < 1 || actor.position.y > Engine.dims.y - 1) actor.velocity.y *= -1;
            if (actor.position.x < 1 || actor.position.x > Engine.dims.x - 1) actor.velocity.x *= -1;
            asteroid.rotation += asteroid.data.angularSpeed;
        });        
    } else {
        // if frame rate drops below 60fps, pick a random actor and destroy it
        const rndIndex = Math.floor(Math.random() * Engine.gameLoop.actors.length);
        const actor    = Engine.gameLoop.actors[rndIndex];
        if (actor != null) actor.destroy();
    }
}

const main = async () => {        
    ass   = await preloadImages({ urls:[`img/explosion.png`]});
    image = CanvasSurface.FromImage(ass[0]);

    // First let's set up the engine        
    Engine.setRootElement('game');              
    Engine.setFlags({ hasEdges:false, hasRenderingSurface:true });

    try {                
        Engine.addLayer({ imgUrl:'img/level1.jpg', scale:1.15, position:Engine.dims.mulScalar(0.5) });        
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }

    // start the engine
    Engine.start(tick); 
}

Engine.init(main);