/*

    Canvas User Interface Demo
    ==========================
    Basic UI Components Intro

*/
import { Engine, Types } from '../../engine.js';
import { TWindow } from '../../canvas-ui/twindow.js';
import { TButton } from '../../canvas-ui/tbutton.js';
import { TCheckbox } from '../../canvas-ui/tcheckbox.js';

const { Vector2:Vec2, V2 } = Types;

const main = async () => {    
    await Engine.setup('../../settings.hjson');        
    await Engine.ui.init();

    const win = Engine.ui.add(TWindow, { 
        position: V2(200, 100), 
        size    : V2(400, 400),
        caption : 'This is a window',
        settings: {
            clWindow        : 'rgba(0,0,0,0)',
            clWindowFrame   : 'transparent',
            clActiveCaption : 'purple',
            //captionOffset   : V2(0, 0),
            captionOffset   : V2(0, 18),
            captionFont     : '20px arial',            
            useBackgroundImage : true,
            useFrames          : true
        }
    });
    const btOk = win.add(TButton, {
        position: V2(140, 320),
        size    : V2(120, 40),
        caption :'OK',
        settings: {
            clBtnFace   : 'purple',
            clBtnActive : 'darkviolet'
        }
    });   
    
    const win2 = Engine.ui.add(TWindow, { 
        position: V2(250, 150), 
        size    : V2(400, 400),
        caption : 'This is window #2',
        settings: {
            clWindow        : 'rgba(0,0,0,0.75)',
            clWindowFrame   : 'transparent',
            clActiveCaption : 'purple',
            captionOffset   : V2(0, 0),            
            captionFont     : '20px broadway',            
        }
    });

    const win3 = Engine.ui.add(TWindow, { 
        position: V2(300, 200), 
        size    : V2(400, 400),
        caption : 'This is window #3',
        settings: {
            clWindow        : 'rgba(0,0,0,0.75)',
            clWindowFrame   : 'transparent',
            clActiveCaption : 'purple',
            captionOffset   : V2(0, 0),            
            captionFont     : '20px broadway',            
        }
    });

    const cbBoobs = win3.add(TCheckbox, {
        position: V2(140, 60),
        size    : V2(120, 40),
        caption :'Select large boobs',
        settings: {
            clBtnFace   : 'purple',
            clBtnActive : 'darkviolet'
        }
    });   

    console.log(Engine.ui);
/*        
    btOk.events.add('mousedown', e => { console.log(e) });
    btOk.events.add('mouseup', e => { console.log(e) });
    btOk.events.add('hide', e => { console.log(e) });
    btOk.events.add('show', e => { console.log(e) });
    btOk.isVisible = true;    
*/
    btOk.isVisible = false;
    

    Engine.start();
}

Engine.init(main);