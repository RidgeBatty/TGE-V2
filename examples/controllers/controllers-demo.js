 /*

    Controllers Demo

    This demo illustrates the use of player controls.
    TGE supports three controller types out of the box: Pointing device (mouse/touchscreen), Gamepad and Keyboard.
    Controllers are attached to the Player actor using Player.attachKeyboard(), attachGamepad() or attachPointer() method.

    In the demo, keyboard controller is attached to the Player and Movement type is set to 'custom', which means that TGE does not apply any movement calculations automatically.
    During tick(), some basic player controls are applied manually by reading the current state of keyboard keys. 

*/

import * as TGE from '../../engine.js';
const Engine = TGE.Engine;	
const { Vector2:Vec2 } = TGE.Types;

const tick = () => {
    const ship = Engine.gameLoop.findActorByName('player-actor');      // get reference to Player Actor
    const keys = ship.controllers['keyboard'].keyState;                     // get reference to Keyboard key state object

    if (keys.left)  ship.rotation -= 0.1;                                   // rotate Player ship counter-clockwise when left arrow is depressed
    if (keys.right) ship.rotation += 0.1;                                   // rotate Player ship clockwise when right arrows is depressed
    if (keys.up)    { 
        const v = Vec2.FromAngle(ship.rotation, 0.05);         // gets unit vector from current ship.rotation angle (length = 1) and scales it down to 5% (length = 0.05)
        ship.addImpulse(v);                                                 // apply impulse to the Player Actor (5% of one pixel size per tick)
    }
}

const main = async () => {        
    // First let's set up the engine        
    Engine.setRootElement('game');              
    Engine.createRenderingSurface(); 
    
    try {        
        Engine.addLayer({ imgUrl:'img/level1.jpg', scale:1.15, position:Engine.dims.mulScalar(0.5) });
        
        // create player ship and add
        const ship = Engine.addActor('player', { name:'player-actor', imgUrl:'img/spaceship.png', scale:0.125, position:new Vec2(Engine.dims.x * .5, 600) });
        ship.movementType = 'custom';
        ship.movement.maxVelocity = 2;                                      // Set maximum velocity of Player to 2 pixels/tick. By default, that translates to maximum speed of 120 pixels per second.
        ship.attachKeyboard();    
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }

    // start the engine
    Engine.start(tick); 
}

Engine.init(main);