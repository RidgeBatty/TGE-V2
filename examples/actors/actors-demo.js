/*

    In this demo two Actors are created from images. Some basic functions such as Actor rotation, scaling and movement are demonstrated.
    The first Actor is a space themed background and the other one is a spaceship.
    By default, all new Actors are placed on the same z-layer. Because the background in this demo is created first, it also gets drawn first
    The dashed red box represents a viewport; 
    The renderingSurface (the larger gray rectangle) is not cleared between draw calls. Therefore the rotating spaceship images remain on the screen if the background does not cover them.
    Typically it is not necessary to clear the renderingSurface between frames, if the background already fills the viewport.

*/

import * as TGE from '../../engine.js';
const Engine = TGE.Engine;	
const { Vector2:Vec2 } = TGE.Types;

const tick = () => {
    const ship = Engine.gameLoop.findActorByName('plr');
    ship.moveBy(1, 0);
    ship.rotation += 0.05;

    if (ship.position.x > 300 + 480) ship.position.x = 300;
}

const main = async () => {    
    
    // First let's set up the engine    
    Engine.setRootElement('game');
    Engine.createRenderingSurface();    

    try {        
        Engine.addActor('actor', { imgUrl:'img/level1.jpg', scale:0.5, position:new Vec2(556, 330) });                

        const ship = Engine.addActor('actor', { name:'plr', imgUrl:'img/spaceship.png', scale:0.125, rotation:Math.PI / 2 });   

        const offset = new Vec2(300, 200 + 50);           // create new Vector2
        ship.moveBy(offset);                                    // set position of Player by moving it by offset (Vector2)
    
        console.log(ship);                              // print contents of Player Actor into the developer console
    } catch (e) {
        console.log('Failed to run actors demo!');
        console.log(e);
        return;
    }

    // start the engine
    Engine.start(tick); 
}

main();