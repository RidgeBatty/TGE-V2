/*
    TGE Colliders Demo

    Six collider shapes (circles) are randomly placed inside the red-dashed viewport. They are given a random velocity vector.
    When they hit the edge of the viewport, they are bounced back by simply mirroring the velocity vector. The checking and mirroring is done inside Tick() function.

    The example uses Vector2 functions extensively to demonstrate how to create random vectors and use vector calculations.

    How to visualize colliders for debugging?
    1) set Engine.gameLoop.flags.showColliders = true       // this enables visualization of colliders. All consecutive actors created after the flag is set will have their visualization enabled.
    2) set Engine.gameLoop.flags.collisionsEnabled = true   // this enables the collision testing of Actors inside gameLoop.tick(). If testing is not enabled, the visualizations will not appear.
    
    To control these features on actor level, use Actor.flags.hasColliders and Actor.flags.showColliders
*/
import * as TGE from '../../engine.js';
import { Circle, Poly } from '../../physics.js';
import { Vector2 } from '../../types.js';

const Engine = TGE.Engine;	
const { Vector2:Vec2 } = TGE.Types;

const origin        = new Vec2(300, 200);                                                                   // stores the top left corner of the viewport
const viewportSize  = new Vec2(480, 270);                                                                   // stores the width and height of the viewport

const createCollider = (actor, kind) => {                                                       // create some colliders for actors
    if (kind == 'circle') {
        const circle = new Circle(new Vec2(0, 0), 256);                                    // create a circle collider and add it in the Actor                
        actor.data.size = 256;
        actor.colliders.add(circle);            
        return;
    }

    const poly = new Poly(new Vector2(0,0));                                                      // create a polygon collider and add it in the actor
    let inner  = new Vec2(0, 192);
    let outer  = new Vec2(0, 512);

    for (let i = 0; i < 5; i++) {                                                                                // make a simple star geometry
        const angle = Math.PI * 2 / 5 * i;
        let a = inner.clone().rotate(angle - Math.PI / 10);
        let b = outer.clone().rotate(angle + Math.PI / 10);
        poly.points.push(...[a, b]);                    
    }                
    actor.data.size = 512;
    actor.colliders.add(poly);    
}

const tick = () => {
    Engine.renderingSurface.resetTransform();
    Engine.renderingSurface.clear();

    Engine.gameLoop.forActors(actor => {        
        if (actor.name == 'star') actor.rotation += 0.01;
        const radius = actor.data.size * actor.scale;
        const pos    = actor.position;        
        if (pos.x < origin.x + radius || pos.x > origin.x + viewportSize.x - radius) actor.velocity.x *= -1;        
        if (pos.y < origin.y + radius || pos.y > origin.y + viewportSize.y - radius) actor.velocity.y *= -1;        
    });
}

const main = async () => {            
    Engine.setRootElement('game');                                                                              // First let's set up the engine
    Engine.createRenderingSurface();

    Engine.gameLoop.flags.collisionsEnabled = true;                                                                 // enable colliders
    Engine.gameLoop.flags.showColliders     = true;                                                                 // visualize colliders        
    
    const plr = Engine.addActor('player');                                                                // create actor with "hasColliders" flag set to true    

    try {                        
        for (let i = 0; i < 6; i++) {                                                                               // create 6 actors        
            const name = (i == 0) ? 'star' : 'circle';

            const a = Engine.addActor('actor', { hasColliders:true, name });                           // create actor with "hasColliders" flag set to true            
            a.setCollisionResponse('WorldDynamic', TGE.Enum_HitTestMode.Overlap);                                   // set collision response channel to respond to overlap events with other 'WorldDynamic' objects 
            a.scale = 0.05 + Math.random() * 0.05;                    
            a.position.add(origin).addScalar(512 * a.scale);                                                        // move the actor to "topLeftCorner"            
            a.position.add(Vec2.Random().mul(viewportSize.clone().subScalar(1024 * a.scale)));              // add a random position inside the viewport (box with red outlines)
            a.velocity = Vec2.RandomDir().mulScalar(0.5);
                        
            createCollider(a, name);                                                                    // create a star and some circles
        }
    } catch (e) {
        console.log('Failed to run colliders demo!');
        console.error(e);
        return;
    }

    Engine.start(tick);                                                                          // start the engine, call tick() on every cycle 60 times/second
}

main();