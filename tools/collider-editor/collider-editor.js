import '../../ext/hjson.min.js';
import { Engine, Types } from '../../engine.js';
import { createUI } from './editor-ui.js';
import { waitClick } from '../../utils.js';
import { Networking } from '../../networking.js';

const { Vector2 : Vec2, V2, Rect } = Types;

const main = async() => {
    await Engine.setup('settings.hjson');    
    Engine.net = new Networking('http://localhost:8080');

    await waitClick('game');                         // get initial user interaction    
    createUI();    
        
    Engine.start();
}

Engine.init(main);