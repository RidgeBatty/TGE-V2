import { Engine, Utils } from '../../engine/engine.js';

class TypeWriterMessage {
    constructor(duration, msg, onComplete) {
        this.length   = msg.length;
        this.msg      = msg.split('');
        this.msg.forEach((e, i) => this.msg[i] = e == '\n' ? '<br>' : e);
        this.dialog   = Utils.addElem({ parent:ID('game'), type:'tge-dialog' });
        this.tick     = 0;
        this.duration = duration;
    }

    update() {
        if (this.dialog && !Engine.isPaused) {
            this.dialog.innerHTML = this.msg.slice(0, Math.floor(this.tick / this.duration * this.length)).join('');

            this.tick++;
            if (this.tick == this.duration) {
                if (this.onComplete) this.onComplete(this);
                    else this.destroy();
            } 
        }
    }

    destroy() {
        this.dialog.remove();
    }
}

const TypeWriter = (...args) => {
    return new TypeWriterMessage(...args);    
}

const CreateButtons = (o) => {    
    const frame   = Utils.addElem({ parent:o.parent, type:'tge-frame' });

    const buttons = [];
    for (const caption of o.captions) {
        const b = Utils.addElem({ parent:frame, type:'tge-button', text:caption });
        buttons.push(b);
    }

    const e1 = Engine.events.add('keypress', e => { 
        for (let i = 0; i < o.keys.length; i++) {
            if (e.code == o.keys[i]) { Engine.events.removeById([e1, e2]); o.actions[i](); }
        }        
    });

    const e2 = Engine.events.add('mouseup', e => {        
        for (let i = 0; i < buttons.length; i++) {
            if (e.target == buttons[i]) { Engine.events.removeById([e1, e2]); o.actions[i](); }
        }        
    });

    return buttons;
}

/**
 * Creates a dialog with a message, any number of buttons and attaches event handlers to buttons which run given actions (functions)
 * @param {object} o 
 * @param {HTMLElement|string} o.parent Parent HTMLElement or a string containing its ID
 * @param {string} o.message Message to display in the dialog
 * @param {[string]} o.captions button captions
 * @param {[string]} o.keys (keyboard) key names 
 * @param {[function]} o.actions functions to call on button press/mouse click
 * @returns 
 */
const CreateDialog = (o) => {
    const dialog  = Utils.addElem({ parent:o.parent, type:'tge-dialog', class:o.class });
    const message = Utils.addElem({ parent:dialog, type:'tge-frame'});
    message.innerHTML = o.message;
    const buttons = CreateButtons(Object.assign(o, { parent:dialog }));
    return { dialog, buttons };
}

/**
 * Presents a choice for the user in a form of promise which can be fulfilled by keyboard keys or clicking with mouse.
 * Choice expects that all the required UI and HTML components already exist.
 * @param {object} o 
 * @param {[string]|[HTMLElement]} o.targets Array of HTMLElements or strings which contain ID's of those elements
 * @param {[string]} o.keys 
 * @returns 
 */
const Choice = (o) => {    
    return new Promise(resolve => {
        for (let i = 0; i < o.targets.length; i++) if (typeof o.targets[i] == 'string') o.targets[i] = ID(o.targets[i]);
        
        const e1 = Engine.events.add('keypress', e => {   
            for (let i = 0; i < o.keys.length; i++) if (e.code == o.keys[i]) {
                Engine.events.removeById([e1, e2]);
                resolve(i);
            }
        });

        const e2 = Engine.events.add('mouseup', e => {            
            for (let i = 0; i < o.targets.length; i++) if (o.targets[i].contains(e.target)) {
                Engine.events.removeById([e1, e2]);
                resolve(i);
            }
        });
    });
}

const WaitDialog = async (o) => {
    const d = CreateDialog(o);	
    await Choice({ targets:d.buttons, keys:o.keys });
}

export { TypeWriterMessage, TypeWriter, CreateDialog, CreateButtons, Choice, WaitDialog }
