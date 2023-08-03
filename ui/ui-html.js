/**
 * 
 * This file contains the basic setup for UI HTML system, but not the actual components
 * 
 */
import { Vector2 as Vec2, V2 } from "../types.js";
import { getJSON, addElem, ID } from "../utils.js";
import * as UIComponents from "./ui-html-components.js";

class UI {
    constructor(engine, UIRootElement) {
        this.components    = [];
        this.children      = this.components;
        this.engine        = engine;
        this.elem          = ID(UIRootElement || engine._rootElem);
        this.flags         = {
            disablePointerEvents : false,            
        }
        this.pointer       = {
            downPos          : Vec2.Zero(),
            downComponentPos : null,
        }
        this.active        = null;              // currently active UWindow component (changes on mousedown event)
        this.objectType    = 'UI';
        this._loadedData   = null;
        
        const mousedown = (e) => {
            if (this.flags.disablePointerEvents) return;                        
            const f = this.components.filter(c => c.elem.contains(e.target));     

            const oldActive = this.active;
            this.active   = null;
            for (const c of f) {
                // NOTE! button is here because we can add button in "thin air" think of a hamburger icon, which cannot let the mousedown even "go through" it on the underlaying layer. Maybe another kind of component is needed for this?
                if ((c.elem.tagName == 'UI-WINDOW' || c.elem.tagName == 'UI-MENU' || c.elem.tagName == 'UI-BUTTON') && c.enabled) {                      
                    this.active = c;
                    this.pointer.downComponentPos = c.position;                                        
                }                   
                if (c.enabled && ('events' in c) && c.events.names.includes('mousedown')) c.events.fire('mousedown', e);
            }       
            
            // close menus on user click (basically a click anywhere in the UI should close a menu)                        
            if (oldActive && oldActive != this.active && oldActive.elem.tagName == 'UI-MENU') oldActive.close();                                
        }

        const mouseup = (e) => {
            if (this.flags.disablePointerEvents) return;                        
            const f = this.components.filter(c => c.elem.contains(e.target));          

            this.active   = null;
            for (const c of f) {
                if ((c.elem.tagName == 'UI-WINDOW' || c.elem.tagName == 'UI-MENU') && c.enabled) {
                    this.active = c;
                    this.pointer.downComponentPos = c.position;                                        
                }                   
                if (c.enabled && ('events' in c) && c.events.names.includes('mouseup')) c.events.fire('mouseup', e);                
            }            
        }

        const mousemove = (e) => {
            if (this.flags.disablePointerEvents) return;   

            if (e.dragging && this.active != null && this.active.isMovable) {                // if we have an active UWindow component and we're dragging with mouse, move the window!                
                this.moveWindow(this.active, e.delta);
            }
            const f = this.components.filter(c => c.elem.contains(e.target));                        
            for (const c of f) if (c.enabled && ('events' in c) && c.events.names.includes('mousemove')) c.events.fire('mousemove', e);
        }

        const keydown = (e) => {
            const f = this.components.filter(c => c.elem.contains(e.target));                      
            for (const c of f) {
                if (c.elem.tagName == 'UI-EDIT') { 
                    return { preventDefault:'cancel' }   
                }
            }           
        }
        const keyup = (e) => {            
            const f = this.components.filter(c => c.elem.contains(e.target));                      
            for (const c of f) {
                if (c.elem.tagName == 'UI-EDIT') { 
                    return { preventDefault:'cancel' }   
                }
            }                       
        }

        engine.events.register(this, { mousedown, mouseup, mousemove, keydown, keyup });
    }

    isInputElement(elem) {
        return (elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement || elem instanceof HTMLSelectElement);		
    }

    findByName(name) {
        let result = null;
        function find(p) {
            if (p.name == name) return result = p;
            for (const c of p.children) find(c);
        }        
        find(this);                
        return result;        
    }

    moveWindow(win, delta) {
        if (this.active.modal || this.active instanceof UIComponents.UButton) return;

        win.position = Vec2.Add(this.pointer.downComponentPos, delta);
        const p = win.position;
        if (p.x < 0) win.position = { x:0 };
        if (p.y < 0) win.position = { y:0 };

        const screen = this.size;                
        if (p.x + win.size.x > screen.x) win.position = { x:screen.x - win.size.x };
        if (p.y + win.size.y > screen.y) win.position = { y:screen.y - win.size.y };                
    }

    get size() {        
        return V2(this.elem.clientWidth, this.elem.clientHeight);       
    }

    createComponent = (parent, c) => {
        if (!('class' in c)) throw 'Component class could not be identified';
        let component = new UIComponents[c.class](Object.assign({ owner:parent }, c));
        this.createChildComponents(component, c);        
        return component;
    }
    
    createChildComponents = (parent, d, container = 'components') => {
        if (!(container in d)) return;
        for (const c of d[container]) {
            if (!('class' in c)) throw 'Component class could not be identified';
            let parentComponent = new UIComponents[c.class](Object.assign({ owner:parent }, c));
            this.createChildComponents(parentComponent, c);
        }
    }

    loadFromFile = async(url) => {
        const data = await getJSON(url);        
        this.createChildComponents(this, data, 'active');
        this._loadedData = data;
        return data;
    }
}


export { UI, UIComponents, addElem }