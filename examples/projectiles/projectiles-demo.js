/*

    Projectiles Demo

    In this demo we are creating a rotating turret which fires homing missiles towards a moving tank.
    The missile animation is implemented using a Flipbook atlas (single image where animation frames are placed on a grid).
    GameLoop.addTimer() function is used to repeatedly fire the missiles in a preset interval.
    Events are utilized extensively: missiles are destroyed after a timeout, which fires 'destroy' event, which in turn creates and explosion actor and starts the explosion animation.
    When the animation is completed, it fires 'end' event which in turn destroys the explosion actor used for the flipbook animation.

*/
import * as TGE from '../../engine.js';
import { preloadImages } from '../../utils.js';
import { CreateMissileInfo } from '../../projectile.js';
import { Flipbook } from '../../flipbook.js';

const Engine = TGE.Engine, GameLoop = Engine.gameLoop;
const { Vector2:Vec2 } = TGE.Types;

const gameObject = { explosion:new Flipbook({ dims:{ x:8, y:8 }}) };

const tick = () => {
    gameObject.turret.rotation += 0.01;        
    if (gameObject.tank.position.x < -100) gameObject.tank.position.x = 1200;
}

const main = async () => {            
    Engine.setRootElement('game');                                                    // First let's set up the engine    
    Engine.createRenderingSurface();    
    Engine.setFlags({ hasEdges:false });
    
    const mInfo = CreateMissileInfo({ homingSpeed:0.01, initialFlightTicks:180 }); // init a MissileInfo object    
        
    let images;
    try {                                                                                 // put all vulnerable code (such as loading of images over internet) inside a try..catch block               
        await gameObject.explosion.loadAsAtlas('img/explosion 2.png');               // create explosion flipbook
        gameObject.explosion.addSequence({ name:'explosion', startFrame:0, endFrame:63, loop:false })
                
        images = await preloadImages({ path:'img/', urls:['Missile.png', 'soil.jpg', 'Tower.png', 'Missile_Launcher2.png', 'red_tank.png'] });      // preload ALL actor images we are going to use

        Engine.addActor('actor', { img:images[1], scale:1.125, position:new Vec2(576, 330) });                

        const base    = GameLoop.add('actor', { img:images[2], scale:0.4, position:new Vec2(200, 150) });
        const turret  = GameLoop.add('actor', { img:images[3], name:'turret', scale:0.4, position:new Vec2(200, 150), zIndex:2 });
        const tank    = GameLoop.add('actor', { img:images[4], name:'tank', scale:0.7, position:new Vec2(1200, 500), rotation:Math.PI * 1.5, zIndex:1 });
        tank.velocity = Vec2.FromAngle(tank.rotation, 0.8);
    
        Object.assign(gameObject, { base, turret, tank });                  // save references to actors in 'gameObject'
    } catch (e) {
        console.log('Failed to run actors demo!');
        console.log(e);
        return;
    }
    
    GameLoop.addTimer({ name:'launch_missile', duration:80, repeat:Infinity,            // create an infinitely repeating timer which launches missiles every 60 ticks (~once a second)
        onRepeat:(e) => { 
            const missile     = GameLoop.add('projectile', { img:images[0], zIndex:1, position:gameObject.turret.position.clone(), rotation:gameObject.turret.rotation + 0.75, scale:0.4, lifeTime:60 * 9 });                              
            missile.target    = gameObject.tank;
            missile.info      = mInfo;                   

            missile.addEvent('destroy', (instigator) => { 
                const eActor  = GameLoop.add('actor', { name:'explosion-actor', scale:1, position:missile.position.clone(), rotation:instigator.rotation + Math.PI * 1.5 });
                const exp     = gameObject.explosion.clone();                                     // clone the explosion animation flipbook (we may have multiple explosions)
                exp.assignTo(eActor);                                                         
                exp.addEvent('end', (e) => { eActor.destroy(); });         // add 'end' event to the flipbook. When the flipbook sequence ends, destroy the Actor (the flipbook loses reference and is destroyed with it)   
                exp.sequences['explosion'].play();
            });
        }
    });
    
    Engine.start(tick);         // start the engine
}

main();