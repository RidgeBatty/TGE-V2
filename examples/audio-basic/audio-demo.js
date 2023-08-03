/*
    In this demo, you can test out the TGE sound sub-system.    
    
    Sounds (c) by Michel Baradari apollo-music.de
    Licensed under CC BY 3.0 http://creativecommons.org/licenses/by/3.0/
    Hosted on opengameart.org

*/
import { Engine } from '/engine.js';
import { InitAudio } from '/audio.js';
import { waitClick, ID } from '/utils.js';

const listenForPause = async (sfx) => {
    await waitClick('game');    

    console.log(sfx.status);
        
    if (sfx.status == 'playing') { ID('cover').textContent = '⏸ Paused'; sfx.pause(); }   
        else if (sfx.status == 'paused') { ID('cover').textContent = '▶️ Playing audio'; sfx.pause(); }

    requestAnimationFrame(_ => listenForPause(sfx));
}

const main = async() => {
    const audio = InitAudio(Engine);
    const data  = await audio.loadFromFile('./sfx/sounds.hjson');                              
    await audio.addBunch(data);     

    await waitClick('game');
    ID('cover').textContent = '▶️ Playing audio';

    Engine.audio.spawn('theme', true).then(sfx => {         
        console.log(sfx);
        listenForPause(sfx);
    });
}

Engine.init(main);