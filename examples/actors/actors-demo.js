import * as TGE from '../../engine.js';
import { Vector } from '../../types.js';
const Engine = TGE.Engine;	
const { Vector2:Vec2 } = TGE.Types;

const tick = (ship) => {
    ship.moveBy(1, 0);
    ship.rotation += 0.05;

    if (ship.position.x > 300 + 480) ship.position.x = 300;
}

const main = async () => {    
    
    // First let's set up the engine    
    Engine.setRootElement('game');
    Engine.recalculateScreen();
    Engine.createRenderingSurface();    

    let ship;
    try {        
        await Engine.addActor('actor', { imgUrl:'img/level1.jpg', scale:0.5, position:new Vector(540, 330) });                

        ship = await Engine.addActor('actor', { imgUrl:'img/spaceship.png' });

        ship.scale = 0.125;
        ship.rotation = 3.14159 / 2;

        const offset = new Vec2(300, 200 + 50);
        ship.moveBy(offset);
    
        console.log(ship);
    } catch (e) {
        console.log('Failed to run actors demo!');
        console.log(e);
        return;
    }

    // start the engine
    Engine.start(_ => tick(ship)); 
}

main();