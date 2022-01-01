/*
    In this demo, background Layer and a spaceship Actor are created from images. Some basic functions such as Actor rotation, scaling and movement are demonstrated.
    The Layer is a space themed background and the other one is a spaceship. A simple wrap-around effect and scrolling are demonstrated. 
    By default, all new Actors and Layers are placed on the same z-layer. Because the background in this demo is created first, it also gets drawn first

    The dashed red box represents a viewport - making it easier to see what's happening behind the scenes.
    The renderingSurface (the larger gray rectangle) is not cleared between draw calls. Therefore the repeating "trick" of the background layer are visible
    Typically it is not necessary to clear the renderingSurface between frames, if the background already fills the viewport.

*/
import * as TGE from '../../engine.js';
const Engine = TGE.Engine;	
const { Vector2:Vec2, Rect } = TGE.Types;

let layer;

const tick = () => {
    const ship = Engine.gameLoop.findActorByName('plr');
    ship.moveBy(-1, 0);
    ship.rotation += 0.05;

    if (ship.position.x < 300) ship.position.x = 300 + 480;

    layer.offset.x += 1;
}

const main = async () => {    
    
    // First let's set up the engine    
    Engine.setRootElement('game');
    Engine.createRenderingSurface();    

    try {        
        layer = Engine.addLayer({ imgUrl:'img/level1.jpg', scale:0.47, repeat:'x', viewport:new Rect(300,200,300 + 480,200 + 270) });        

        const ship = Engine.addActor('actor', { name:'plr', imgUrl:'img/spaceship.png', scale:0.125, rotation:Math.PI / 2 });   

        const offset = new Vec2(300, 200 + 50);           // create new Vector2
        ship.moveBy(offset);                                    // set position of Player by moving it by offset (Vector2)
    
        console.log(ship);                              // print contents of Player Actor into the developer console
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }

    // start the engine
    Engine.start(tick); 
}

Engine.init(main);