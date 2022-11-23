 /*

    Controllers Demo

    This demo illustrates the use of player controls.
    TGE supports three controller types out of the box: Pointing device (mouse/touchscreen), Gamepad and Keyboard.
    Controllers are attached to the Player actor using Player.attachKeyboard(), attachGamepad() or attachPointer() method.

    In the demo, keyboard controller is attached to the Player and Movement type is set to 'custom', which means that TGE does not apply any movement calculations automatically.
    During tick(), some basic player controls are applied manually by reading the current state of keyboard keys. 

*/

import { InitAudio } from '../../audio.js';
import { Engine, Types } from '../../engine.js';
import { MainMenu } from '../../mainmenu.js';

const { Vector2:Vec2, V2 } = Types;

const main = async () => {                    
    Engine.setup({ rootElem:'game', flags: { hasRenderingSurface:true } });

    Engine.addLayer({                                                       // create a background layer for the "game"
        imgUrl:'/assets/img/level1.jpg', 
        scale:1.15, 
        position:Engine.dims.mulScalar(0.5), 
        increment:V2(-0.15, 0),
        repeat:'x',
        zIndex:0 
    });    

    InitAudio(Engine);                                                      // init audio to allow menu sound effects to be played

    const menu  = new MainMenu('game');                                     // create menu component
    await menu.loadFromFile('mainmenu');                                    // load menu contents from file

    // add your custom events into the main menu:
    menu.events.add('select', e => console.log(e));
    menu.events.add('change', e => console.log(e));

    Engine.start();                                                         // start the engine
}

Engine.init(main);                                                          // first let's set up the engine