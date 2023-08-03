 /*

   Actor Stress Test Demo

   Automatically keep adding more actors on the screen until FPS drops below 60 

*/
import { Engine, Types } from '/engine.js';
import Debug from '/tools/debug.js';
import { preloadImages } from '/utils.js';
import { CanvasSurface } from '/canvasSurface.js';

const { Vector2:Vec2, V2 } = Types;

const tick = (images) => {        
    if (Engine.getFPS() >= 60) {                                                                // if frame rate is at 60fps, create a new actor at random spot on the screen and give it random velocity
        const index    = Math.floor(Math.random() * 3);                                              
        const position = Vec2.Add(Vec2.Random().mul(Engine.dims.sub(V2(32, 32))), V2(16, 16));
        const asteroid = Engine.addActor('actor', { name:'asteroids', img:images[index], position });
        asteroid.velocity = Vec2.RandomDir();
        asteroid.rotation = Vec2.RandomDir().toAngle();
        asteroid.scale    = 0.05 + Math.random() * 0.1;
        asteroid.data.angularSpeed = (Math.random() - 0.5) * 0.1;
        
        asteroid.events.add('tick', (a) => {                                                    // check for bounds and make the asteroid bounce off from screen edges
            const actor = a.instigator;
            if (actor.position.y < 1 || actor.position.y > Engine.dims.y - 1) actor.velocity.y *= -1;
            if (actor.position.x < 1 || actor.position.x > Engine.dims.x - 1) actor.velocity.x *= -1;
            asteroid.rotation += asteroid.data.angularSpeed;
        });        
    } else {                                                                                    // if frame rate drops below 60fps, pick a random actor and destroy it        
        const rndIndex = Math.floor(Math.random() * Engine.gameLoop.actors.length);
        const actor    = Engine.gameLoop.actors[rndIndex];
        if (actor != null) actor.destroy();
    }
}

const main = async () => {        
    await Engine.setup('./settings.hjson');                                                     // set up the game engine

    const path   = '/assets/img/';
    const ass    = await preloadImages({ path, urls:[`asteroid1.png`, `asteroid2.png`, `asteroid3.png`]});
    const images = ass.map(i => CanvasSurface.FromImage(i));

    try {                
        Engine.addLayer({ imgUrl:`${path}/level1.jpg`, scale:1.15, position:Engine.dims.mulScalar(0.5) });        
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }
    
    Engine.start(_ => { tick(images); });                                                      // start the engine
}

Engine.init(main);