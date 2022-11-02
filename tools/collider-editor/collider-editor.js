import '../../ext/hjson.min.js';
import { Engine, Types } from '../../engine.js';
import { createUI } from './ui.js';

const { Vector2 : Vec2, V2, Rect } = Types;

const main = async() => {
    Engine.setup({
        rootElem:'game',
        clearColor:'erase',
        flags:{ hasEdges:false, hasRenderingSurface:true, hasUI:true, preventKeyDefaults:false },
        gameLoop:{
            flags: { collisionsEnabled:true, showColliders:true }
        }
    });
    Engine.gameLoop.onPanic = () => { console.error('Gameloop panic!') }
    
    const editor = createUI();
    
    Engine.start();
}

Engine.init(main);