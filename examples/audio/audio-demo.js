/*
    In this demo, you can test out the TGE sound sub-system.    
    
    Sounds (c) by Michel Baradari apollo-music.de
    Licensed under CC BY 3.0 http://creativecommons.org/licenses/by/3.0/
    Hosted on opengameart.org

*/
import { Engine, Types } from '../../engine.js';
import { InitAudio } from '../../audio.js';
import { ID } from '../../utils.js';

const { Vector2:Vec2 } = Types;

let missileId = 0;
let init      = false;

const buttonPress = (id) => {
    ID(id).classList.add('pressed');
    Engine.gameLoop.addTimer({ duration:60, onComplete:_ => { ID(id).classList.remove('pressed'); } });
}

const launchRocket = () => {
    buttonPress('launch');

    const m = Engine.gameLoop.findActorByName(`missile_${missileId}`);
    m.velocity.add(Vec2.Up().mulScalar(2));
    m.data.pan = missileId / 5 - 1;
    m.movement.maxVelocity = 2;
    
    Engine.audio.spawn('launch', { pan:m.data.pan }).then(r => console.log(r));

    Engine.gameLoop.addTimer({ actor:m, duration:180, onComplete:(timerEvent) => { 
        const actor = timerEvent.actor;        
        Engine.audio.spawn('explode', { pan: actor.data.pan });
        actor.destroy();
    }});

    missileId++;
}

const onClick = async (e) => {    
    if (init == false) {                                                    // Initialize audio subsystem (reference is available through Engine.audio property)         
        ID('cover').classList.add('fold');
        init = true;
        const audio = InitAudio(Engine);
        const data  = await audio.loadFromFile('./sfx/sounds.hjson');                              
        await audio.addBunch(data);     
        await audio.spawn('theme', true);                                   // play theme music
    }
    
    if (e.target.id == 'mute')        { buttonPress('mute'); Engine.audio.mute(); }
    if (e.target.id == 'soft-mute')   { buttonPress('soft-mute'); Engine.audio.fadeMute(3); }
    
    if (missileId < 10 && e.target.id == 'launch') launchRocket();          // if there's any missiles left, launch next one
}

const onTick = () => {
    if (Engine.audio) {
        if (Engine.audio.isMuted)  ID('mute').classList.add('check-off');
        if (!Engine.audio.isMuted) ID('mute').classList.remove('check-off');        

        if (Engine.audio.fadeVolume == 0) ID('soft-mute').classList.add('check-off');
        if (Engine.audio.fadeVolume == 1) ID('soft-mute').classList.remove('check-off');        
    }
}

const main = async () => {        
    await Engine.setup('./settings.hjson');

    try {                       
        Engine.addLayer({ imgUrl:'img/level1.jpg' });        

        for (let i = 0; i < 10; i++) {
            Engine.addActor('actor', { 
                name:    `missile_${i}`, 
                imgUrl:  'img/Missile.png', 
                scale:    0.5, 
                position: new Vec2(330 + i * 50, 500) 
            });
        }
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }

    Engine.events.add('mouseup', onClick);
    Engine.start(onTick);                                                         // Start the engine
}

Engine.init(main);