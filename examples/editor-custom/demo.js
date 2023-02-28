/*

    Tools - CustomEditor Demo
    =========================
    CustomEditor is a base class component for creating visual editors which are based on 2D cartesian coordinate system

*/
import { Engine, Types } from '../../engine.js';
import { CustomEditor } from '../../tools/customEditor.js';

const { Vector2:Vec2, V2 } = Types;

const main = async () => {    
    await Engine.setup('../../settings.hjson');        
 
    const editor = new CustomEditor({ engine:Engine });
    await editor.init();

    Engine.events.add('keydown', e => { 
    });

    Engine.start();
}

Engine.init(main);