/*
    Creates a spaceship on the center of the viewport and controls its movement based on timer events  
*/
import { Engine, Types } from '/engine.js';

const { V2 } = Types;

const tick = () => {
    const ship = Engine.gameLoop.findActorByName('player');
    ship.moveBy(0, -1);        
}

const createPlayer = () => {
    const ship   = Engine.addActor('actor', { 
        name:'player', 
        imgUrl:'/assets/img/spaceship.png', 
        scale:0.125, 
        rotation:Math.PI                                                         // rotate player's ship by 180 degrees
    });
    const offset = Engine.dims.mulScalar(0.5);                                   // set player offset to center of viewport
    ship.moveBy(offset);                                                         // set position of Player by moving it by offset (Vector2)

    return ship;
}

const main = async () => {    
    await Engine.setup('./settings.hjson');

    try {        
        const layer  = Engine.addLayer({ imgUrl:'/assets/img/level1.jpg' });                
        const ship   = createPlayer();

        Engine.gameLoop.onAfterRender = () => {                                   // create a makeshift HUD by drawing directly on game canvas after the gameLoop has completed its rendering
            Engine.renderingSurface.resetTransform();
            Engine.renderingSurface.textOut(V2(10, 10), seconds, { font:'64px Arial', color:'red', textBaseline:'top' });
        }

        /**
         * 1. Create a timer which repeats on 60 tick intervals (1 second by default)
         * 2. Make the timer repeat indefinitely
         * 3. On every repeat, increment the "seconds" variable 
         * 4. On every 3rd repeat, make the ship bounce back to center of the viewport
         * 5. On the 10th repeat, destroy the timer (the ship continues to fly indefinitely)
         */
        let seconds = 0;

        const myTimer = Engine.gameLoop.addTimer({ 
            name:'myTimer', 
            duration:60, 
            repeat:Infinity,                                                      // make timer repeat indefinitely
            onRepeat:() => { 
                ship.position.y = Engine.dims.y * 0.5;                            // bounce player ship back to screen center
                seconds++; 
                if (seconds == 10) Engine.gameLoop.deleteTimer(myTimer);          // on 10th repeat, we want to remove the timer (or set repeat to 10 when creating the timer)               
            },             
        });

        Engine.start(tick);                                                       // start the engine
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }    
}

Engine.init(main);