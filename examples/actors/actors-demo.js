/*
    Do not use JavaScript timers (setTimeout, setInterval) in your games. They are inaccurate and unpredictable in scenarios where high precision is needed.
    

*/
import { Engine, Types } from '../../engine.js';

const { V2, Rect } = Types;

const tick = (layer) => {
    const ship = Engine.gameLoop.findActorByName('plr');
    ship.moveBy(-1, 0);
    ship.rotation += 0.05;

    if (ship.position.x < 300) ship.position.x = 300 + 480;

    layer.offset.x += 1;
}

const main = async () => {    
    await Engine.setup('./settings.hjson');

    try {        
        const layer  = Engine.addLayer({ imgUrl:'/assets/img/level1.jpg', scale:0.47, repeat:'x', viewport:new Rect(300,200,300 + 480,200 + 270) });        
        const ship   = Engine.addActor('actor', { name:'plr', imgUrl:'/assets/img/spaceship.png', scale:0.125, rotation:Math.PI / 2 });   
        const offset = V2(300, 200 + 50);                               // create new Vector2
        ship.moveBy(offset);                                            // set position of Player by moving it by offset (Vector2)
    
        console.log(ship);                                              // print contents of Player Actor into the developer console

        Engine.start(_ => tick(layer));                                 // start the engine
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }    
}

Engine.init(main);