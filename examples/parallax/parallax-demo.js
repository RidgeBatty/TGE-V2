import * as TGE from '../../engine.js';
import { Parallax }  from '../../parallax.js';
const Engine = TGE.Engine;	

const main = async () => {
    try {
        const parallax = await Parallax.Make({ url:'forest-parallax.json' })            
    } catch (e) {
        console.log('Failed to load & run parallax!');
        console.log(e);
        return;
    }

    console.log('Parallax loaded');

    Engine.setRootElement('game');
    Engine.recalculateScreen();
    Engine.createRenderingSurface();
    Engine.start();
}

main();