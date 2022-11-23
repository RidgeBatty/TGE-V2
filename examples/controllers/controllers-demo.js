 /*

    Controllers Demo

    This demo illustrates the use of player controls.
    TGE supports three controller types out of the box: Pointing device (mouse/touchscreen), Gamepad and Keyboard.
    Controllers are attached to the Player actor using Player.attachKeyboard(), attachGamepad() or attachPointer() method.

    In the demo, keyboard controller is attached to the Player and Movement type is set to 'custom', which means that TGE does not apply any movement calculations automatically.
    During tick(), some basic player controls are applied manually by reading the current state of keyboard keys. 

*/

import { Engine, Types } from '../../engine.js';

const { Vector2:Vec2, V2 } = Types;

const tick = () => {
    const ship    = Engine.gameLoop.findActorByName('player-actor');        // get reference to Player Actor
    const keys    = ship.controllers['keyboard'].keyState;                  // get reference to Keyboard key state object
    const gamepad = ship.controllers['gamepad'];
    const v       = gamepad.vectors;

    if (keys.left || (v && v.left.x == -1)) ship.rotation -= 0.1;           // rotate Player ship counter-clockwise when left arrow is depressed
    if (keys.right || (v && v.left.x == 1)) ship.rotation += 0.1;           // rotate Player ship clockwise when right arrows is depressed
    if (keys.up || (v && v.right.y == -1)) { 
        const vec = Vec2.FromAngle(ship.rotation, 0.05);                    // gets unit vector from current ship.rotation angle (length = 1) and scales it down to 5% (length = 0.05)
        ship.addImpulse(vec);                                               // apply impulse to the Player Actor (5% of one pixel size per tick)
    }
}

const makeBackgroundLayer = () => {
    const layer     = Engine.addLayer({ imgUrl:'img/level1.jpg', scale:1.15, position:Engine.dims.mulScalar(0.5), zIndex:0 });
    const oldUpdate = layer.update;
    const rs        = Engine.renderingSurface;    
    
    layer.update = () => {
        const ship = Engine.gameLoop.findActorByName('player-actor');
        if (!ship) return;        

        oldUpdate.call(layer);

        const gamepad = ship.controllers['gamepad'];
        if (gamepad.vectors == null) return;

        const v = gamepad.vectors;        
        rs.drawRect({ left:0, top:0, width:200, height:200 }, { stroke:'red', fill:'rgba(255,0,0,0.1)' });
        rs.drawArrow(V2(100, 100), { angle:v.left.toAngle(), length:v.left.length * 100, sweep:0.9 }, 'red');

        rs.drawRect({ left:1152 - 200, top:0, width:200, height:200 }, { stroke:'lime', fill:'rgba(0,255,0,0.1)' });
        rs.drawArrow(V2(1152 - 100, 100), { angle:v.right.toAngle(), length:v.right.length * 100, sweep:0.9 }, 'lime');        
    }
}

const main = async () => {                    
    Engine.setup({ rootElem:'game', flags: { hasRenderingSurface:true } });
    
    const ship = Engine.addActor('player', {                                // create player ship and add
        name:'player-actor', 
        imgUrl:'img/spaceship.png', 
        scale:0.125, 
        position: V2(Engine.dims.x * .5, 600) 
    });
    ship.movementType = 'custom';
    ship.movement.maxVelocity = 2;                                          // Set maximum velocity of Player to 2 pixels/tick. By default, that translates to maximum speed of 120 pixels per second.
    ship.attachKeyboard();    
    ship.attachGamepad();    

    makeBackgroundLayer();

    Engine.start(tick);                                                     // start the engine
}

Engine.init(main);                                                          // first let's set up the engine