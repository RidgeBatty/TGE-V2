/*

    Canvas User Interface Demo
    ==========================
    Basic UI Components Intro

*/
import { Engine, Types } from '../../engine.js';
import { TWindow } from '../../canvas-ui/twindow.js';
import { TButton } from '../../canvas-ui/tbutton.js';
import { TCheckbox } from '../../canvas-ui/tcheckbox.js';
import { TListbox } from '../../canvas-ui/tlistbox.js';
import { TScrollbar } from '../../canvas-ui/tscrollbar.js';

const { Vector2:Vec2, V2 } = Types;

const main = async () => {    
    await Engine.setup('../../settings.hjson');        
    await Engine.ui.init('../../canvas-ui/default.styles.hjson');

    const win = Engine.ui.add(TWindow, { 
        position: V2(200, 100), 
        size    : V2(400, 400),
        caption : 'First',
        settings: {
            clWindow          : 'rgba(0,0,0,0)',
            clWindowFrame     : 'transparent',
            clActiveCaption   : 'rgba(200,0,200,0.7)',    
            clInactiveCaption : 'rgba(80,80,80,0.7)',                       
            useBackgroundImage : true,
            useFrames          : true,
            titleBar : {
                baseline     : 'middle',
                font         : '20px arial',            
                textOffset   : V2(10, 0),
                offset       : V2(0, 32),
                align        : 'center'
            }            
        }
    });    
    
    const btOk = win.add(TButton, {
        position  : V2(140, 320),
        size      : V2(120, 40),        
        caption   :'OK',        
        settings  : {
            clBtnFace : 'purple'
        }
    });   
    
    const win2 = Engine.ui.add(TWindow, { 
        position: V2(750, 150), 
        size    : V2(400, 400),
        caption : 'Second Window',
        settings: {
            clWindow        : 'rgba(0,0,0,0.75)',
            clWindowFrame   : 'transparent',
            titleBar : {
                textOffset   : V2(10, 0),
                font         : '28px algerian',            
            }
        }
    });
    
    const lbItems = win2.add(TListbox, {
        position: V2(10, 80),
        size    : V2(350, 240),        
        items   : ['Hello', 'Banana', 'Monkey', 'Eggplant', 'Green', 'Blue', 'White', 'Dickcheese']
    });       

    const sbItems = win2.add(TScrollbar, {
        position: V2(362, 80),
        size    : V2(28, 240),     
        targetControl : lbItems,   
    });

    const win3 = Engine.ui.add(TWindow, { 
        position: V2(300, 200), 
        size    : V2(400, 400),
        caption : 'Third',
        settings: {
            clWindow        : 'rgba(0,0,0,0.75)',
            clWindowFrame   : 'transparent',
            titleBar : {
                textOffset   : V2(10, 0),
                align : 'center'
            }
        }
    });
    
    const cbBoobs = win3.add(TCheckbox, {
        position: V2(140, 60),
        size    : V2(120, 28),
        caption :'Select large boobs',   
        settings : {
            checkMark : '🍼'
        }             
    });   

    const cbDick = win3.add(TCheckbox, {
        position: V2(140, 90),
        size    : V2(120, 28),
        caption :'Select tiny cock',        
        settings : {
            checkMark : '🍆'
        }     
    });   

    const cbAss = win3.add(TCheckbox, {
        position: V2(140, 120),
        size    : V2(120, 28),
        caption :'More ass',        
        settings : {
            checkMark : '🍑'
        } 
    });   

    const cbCheck = win3.add(TCheckbox, {
        position: V2(140, 150),
        size    : V2(120, 28),
        caption :'Check me!!!',                
        settings : {
            boxAlign : 'right'
        }
    });   

    console.log(Engine.ui);
    
    Engine.events.add('keydown', e => { 
        console.log(e.code);
        if (e.code == 'Space') {
            Engine.ui.children.forEach(f => { console.log(f.caption + ' --> ' + f.zIndex + ' --> ' + f.isActive); });
        }
    });
    Engine.start();
}

Engine.init(main);