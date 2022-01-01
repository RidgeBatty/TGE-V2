import * as TGE from '../../engine.js';
import { Parallax }  from '../../parallax.js';
const Engine = TGE.Engine;	

const main = async () => {

    // create a parallax effect from JSON data file
    try {
        const parallax = await Parallax.Make({ url:'forest-parallax.json' })            
    } catch (e) {
        console.log('Failed initialize/load assets for the demo!');
        console.log(e);
        return;
    }

    console.log('Parallax loaded');

    // set up and start engine
    Engine.setRootElement('game');
    Engine.createRenderingSurface();
    Engine.start();
}

Engine.init(main);