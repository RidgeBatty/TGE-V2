/*

    Projectiles Demo

    In this demo we are creating a rotating turret which fires homing missiles towards a moving tank.
    The missile animation is implemented using a Flipbook atlas (single image where animation frames are placed on a grid).
    GameLoop.addTimer() function is used to repeatedly fire the missiles in a preset interval.
    Events are utilized extensively: missiles are destroyed after a timeout, which fires 'destroy' event, which in turn creates and explosion actor and starts the explosion animation.
    When the animation is completed, it fires an 'end' event which in turn destroys the explosion actor used for the flipbook animation.

*/
import { Engine, Types } from '../../engine.js';
import { preloadImages } from '../../utils.js';
import { CreateMissileInfo } from '../../projectile.js';
import { Flipbook } from '../../flipbook.js';

const { gameLoop }         = Engine;
const { Vector2:Vec2, V2 } = Types;

const game = {
    expAnim     : new Flipbook({ dims:V2(8, 8) }),
    imageUrls   : ['Missile.png', 'soil.jpg', 'Tower.png', 'Missile_Launcher2.png', 'red_tank.png'],
    missileInfo : CreateMissileInfo({ homingSpeed:0.01, initialFlightTicks:60 }),              // init a MissileInfo object            
    images      : []
}

const tick = () => {                                                                            // On every tick...    
    game.turret.rotation += 0.01;                                                               // rotate the gun turret
    if (game.tank.position.x < -100) game.tank.position.x = 1200;                               // and move the tank
}

const loadImages = async () => {    
    try {                                                                                       // put all vulnerable code (such as loading of images over internet) inside a try..catch block               
        await game.expAnim.loadAsAtlas('img/explosion 2.png');                                  // create explosion flipbook
        game.expAnim.addSequence({ name:'explosion', startFrame:0, endFrame:63, loop:false })                        
        return await preloadImages({ path:'img/', urls:game.imageUrls });                       // preload ALL actor images we are going to use        
    } catch (e) {
        console.log('Failed to run projectiles demo!');
        console.log(e);
        return;
    }
}

const launchMissile = () => { 
    const missile     = gameLoop.add('projectile', { img:game.images[0], zIndex:1, position:game.turret.position.clone(), rotation:game.turret.rotation + Math.PI, scale:0.4, lifeTime:60 * 5 });
    missile.target    = game.tank;
    missile.info      = game.missileInfo;

    missile.events.add('destroy', o => { 
        const eActor  = gameLoop.add('actor', { name:'explosion', scale:1, position:missile.position.clone(), rotation:o.instigator.rotation + Math.PI * 0.5 });
        eActor.flags.isFlipbookEnabled = true;                                                  // enable default flipbook animations
        
        const exp     = game.expAnim.clone(eActor);                                             // clone the explosion animation flipbook (we may have multiple explosions) and replace the Actor reference
        exp.events.add('end', _ => { eActor.destroy(); });                                      // add "end" event to the flipbook. When the flipbook sequence ends, destroy the Actor (the flipbook loses reference and is destroyed with it)                   
        exp.play('explosion');                                                                  // play "explosion" sequence from the actor's flipbook
    });
}

const main = async () => {                    
    await Engine.setup('./settings.hjson');                                                     // set up the game engine

    game.images   = await loadImages();                                                         // preload game graphics
    
    gameLoop.add('actor', { img:game.images[1], scale:1.125, position:V2(576, 330) });
    gameLoop.add('actor', { img:game.images[2], scale:0.4, position:V2(200, 150) });
    const turret  = gameLoop.add('actor', { img:game.images[3], name:'turret', scale:0.4, position:V2(200, 150), zIndex:2 });
    const tank    = gameLoop.add('actor', { img:game.images[4], name:'tank', scale:0.7, position:V2(1200, 500), rotation:Math.PI * 0.5, zIndex:1 });
    tank.velocity = Vec2.FromAngle(tank.rotation, 0.8);

    Object.assign(game, { turret, tank });                                                      // save references to actors in "game" object
    
    gameLoop.addTimer({                                                                         // create an infinitely repeating timer which launches missiles every 80 ticks
        name: 'launch_missile', 
        duration: 80, 
        repeat: Infinity,    
        onRepeat: launchMissile
    });
    
    Engine.start(tick);                                                                         // start the engine
}

Engine.init(main);