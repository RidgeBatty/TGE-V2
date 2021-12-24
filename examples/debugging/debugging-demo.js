/*

    Debugging Demo
    
*/
import * as TGE from '../../engine.js';
import { preloadImages } from '../../utils.js';
import { CreateMissileInfo } from '../../projectile.js';
import { Flipbook } from '../../flipbook.js';
import { DevTools } from '../../tools/devtools.js';
import { Box, Circle } from '../../physics.js';

const Engine = TGE.Engine, GameLoop = Engine.gameLoop;
const { Vector2:Vec2, CreateVector2:V2 } = TGE.Types;

const game    = {};
const expAnim = new Flipbook({ dims:{ x:8, y:8 }});

const tick = () => {                                                                // On every tick...
    game.turret.rotation += 0.01;                                                         // rotate the gun turret
    if (game.tank.position.x > 1200) {
        game.tank.position.y = (game.tank.position.y == 500) ? 200 : 500;            
        game.tank.position.x = -100;        
    }
}

const main = async () => {            
    Engine.setRootElement('game');                                                    // First let's set up the engine    
    Engine.setFlags({ hasEdges:false, hasRenderingSurface:true });
    GameLoop.setFlags({ showBoundingBoxes: true, showColliders: true, collisionsEnabled: true });
    
    const mInfo = CreateMissileInfo({ homingSpeed:0.02, initialFlightTicks:60 }); // init a MissileInfo object    
        
    let images;
    try {                                                                                 // put all vulnerable code (such as loading of images over internet) inside a try..catch block               
        await expAnim.loadAsAtlas('img/explosion 2.png');                            // create explosion flipbook
        expAnim.addSequence({ name:'explosion', startFrame:0, endFrame:63, loop:false })
                
        images = await preloadImages({ path:'img/', urls:['Missile.png', 'soil.jpg', 'Tower.png', 'Missile_Launcher2.png', 'red_tank.png'] });      // preload ALL actor images we are going to use

        GameLoop.add('actor', { img:images[1], name:'background', scale:1.125, position:V2(576, 330) });                
        GameLoop.add('actor', { img:images[2], name:'tower', scale:0.4, position:V2(200, Engine.dims.y / 2) });
        const turret  = GameLoop.add('player', { img:images[3], name:'turret', scale:0.4, position:V2(200, Engine.dims.y / 2), zIndex:2 });
        const tank    = GameLoop.add('enemy', { img:images[4], name:'tank', scale:0.7, position:V2(1200, 500), rotation:Math.PI * 1.5, zIndex:1 });
        tank.addCollider(new Box(V2(0, 0), V2(144, 166)));        
        tank.velocity = Vec2.FromAngle(tank.rotation + Math.PI, 1);
    
        Object.assign(game, { turret, tank });                             // save references to actors in 'game'
    } catch (e) {
        console.log('Failed to run projectiles demo!');
        console.log(e);
        return;
    }
    
    GameLoop.addTimer({ name:'launch_missile', duration:120, repeat:Infinity,           // create an infinitely repeating timer which launches missiles every 80 ticks
        onRepeat:() => { 
            const missile     = GameLoop.add('projectile', { img:images[0], instigator:game.turret, name:'missile', zIndex:1, position:game.turret.position.clone(), rotation:game.turret.rotation, scale:0.4, lifeTime:60 * 15 });
            missile.addCollider(new Box(Vec2.Zero(), V2(50, 100)));
            missile.target    = game.tank;
            missile.info      = mInfo;

            missile.addEvent('beginoverlap', (o) => o.actor.destroy());        // boom hit                        
            missile.addEvent('destroy', (o) => { 
                const eActor  = GameLoop.add('actor', { name:'explosion', position:missile.position.clone(), rotation:o.instigator.rotation + Math.PI * 1.5 });
                const exp     = expAnim.clone(eActor);                      // clone the explosion animation flipbook (we may have multiple explosions) and replace the Actor reference
                exp.addEvent('end', _ => eActor.destroy());             // add 'end' event to the flipbook. When the flipbook sequence ends, destroy the Actor (the flipbook loses reference and is destroyed with it)   
                exp.sequences['explosion'].play();
            });
        }
    });

    Engine.start(tick);         // start the engine
}

main();