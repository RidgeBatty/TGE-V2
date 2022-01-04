 /*

    Actor Target Demo

    This demo is built on Actor Controllers demo, you might want to check it out first!
    
    You have a spaceship (actor) on the bottom of the viewport which you can control with keyboard. 
    Three asteroid actors are created whose target is set to your ship, which makes them orbit your ship.
    To change the parameters of how the orbiting works, use "Actor.movement" object.

*/
import * as TGE from '../../engine.js';

const Engine = TGE.Engine;	
const { Vector2:Vec2 } = TGE.Types;

const tick = () => {
    const ship = Engine.gameLoop.findActorByName('player-actor');      // get reference to Player Actor
    const keys = ship.controllers['keyboard'];                              // get reference to Keyboard key state object

    if (keys.keyState.left)  ship.rotation -= 0.1;                          // rotate Player ship counter-clockwise when left arrow is depressed
    if (keys.keyState.right) ship.rotation += 0.1;                          // rotate Player ship clockwise when right arrows is depressed
    if (keys.keyState.up)    { 
        const v = Vec2.FromAngle(ship.rotation, 0.05);         // gets unit vector from current ship.rotation angle (length = 1) and scales it down to 5% (length = 0.05)
        ship.addImpulse(v);                                                 // apply impulse to the Player Actor (5% of one pixel size per tick)
    }
}

const main = async () => {        
    // First let's set up the engine        
    Engine.setRootElement('game');              
    Engine.setFlags({ hasEdges:false, hasRenderingSurface:true });

    try {                
        Engine.addLayer({ imgUrl:'img/level1.jpg', scale:1.15, position:Engine.dims.mulScalar(0.5) });                        
                
        // create player ship and add it in GameLoop
        const ship = Engine.addActor('player', { name:'player-actor', zIndex:2, imgUrl:'img/spaceship.png', scale:0.125, position:new Vec2(Engine.dims.x * .5, 420) });
        ship.movementType = 'custom';        
        ship.attachKeyboard();            

        // create 3 actors and make them orbit and follow the player
        for (let i = 0; i < 3; i++) {
            const asteroid  = Engine.addActor('actor', { name:'asteroid', imgUrl:`img/asteroid${i % 3 + 1}.png`, scale:0.15, position:new Vec2(Engine.dims.x / 3 * i + 100,50) });               

            // set up the ActorMovement object 
            asteroid.movement.from({ 
                speed         : 0,
                maxVelocity   : 0.7,
                acceleration  : 0.01,
                orbitRadius   : 200, 
                orbitOffset   : Math.PI * 2 / 3 * i,
                orbitDuration : 0.07,
                angularSpeed  : '0.333/s'                   // makes this actor rotate 1/3 of a revolution per second
            });                        

            // set the Player ship as target:
            asteroid.target = ship;            
        }        

        /**
         * Sets up and adds a custom render layer in the GameLoop. This layer displays debug information about the actors and their movement paths.
         * Custom layers need to have "zIndex" property (rendering order), and "update()" method (draws graphics on Engine.renderingSurface).
         */
        const update = () => {            
            Engine.gameLoop.forActors(e => {
                if (e.name == 'player-actor') {
                    Engine.renderingSurface.resetTransform();                    
                    Engine.renderingSurface.drawPoly(e.position, { stroke:'lime' });
                } 
                if (e.name == 'asteroid') {                        
                    if (e.movement._targetPosition) {
                        Engine.renderingSurface.resetTransform();
                        const targetAngle = e.movement._targetDir.toAngle();
                        Engine.renderingSurface.drawCircle(e.movement._targetPosition, 3, { stroke:'yellow' });
                        Engine.renderingSurface.drawCircle(e.position, 25, { stroke:'yellow' });
                        Engine.renderingSurface.drawArrow(e.position, { angle:targetAngle, length:e.movement._targetDistance, width:1, sweep:0.85, head:10 }, 'red');
                        Engine.renderingSurface.textOut(e.position.clone().add(new Vec2(30, 7)), (targetAngle / Math.PI * 180).toFixed(0)+'°', { color:'white', font:'20px arial' });
                    }
                }
            });
        }        

        // Create and add the layer
        Engine.gameLoop.add('custom', { update, zIndex:2 });
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }
    
    Engine.start(tick); // start the engine
}

Engine.init(main);