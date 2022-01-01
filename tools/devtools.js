/**
 * 
 * TGE DevTools
 * 
 * Enable this only in development mode
 * Written by Ridge Batty (c) 2021
 * 
 */
import { Engine, Actor, Types } from '../engine.js';
import { Controllers } from '../gameController.js';
import { UI } from '../html-ui.js';
import { arraysEqual } from '../utils.js';
import Debug from '../tools/debug.js';
import { Vector2 } from '../types.js';

const Vec2 = Types.Vector2;

const Keys = {
    stopEngine : 'Ctrl+Space',
    showDebugLayer : 'Ctrl+d',
}

let keyDownActors = [],
    lastClicked   = { actor:null, index:-1 },
    mouseDownPos  = Vec2.Zero(),
    mouseUpPos    = Vec2.Zero();

/**
 * Set up the UI
 */
UI.autoReplaceParent = false;
const panel           = UI.add({ type:'panel', name:'buttons', style:'right:0px' });
const cbPanel         = panel.add({ type:'panel', name:'checkboxes', className:'relative' });

const cbShowColliders = cbPanel.add({ type:'checkbox', caption:'Show Colliders' });
const cbShowBB        = cbPanel.add({ type:'checkbox', caption:'Show Bounding Boxes' });

const btPauseEngine   = panel.add({ type:'button', name:'pause', caption:'Pause' });
const btFiles         = panel.add({ type:'button', name:'files', caption:'Files' });

const selWin          = UI.add({ type:'window', name:'sel-actors', caption:'Selected Actors', position:new Vec2(1600, 160), size: new Vec2(240, 200) });
const lbSelectActor   = selWin.add({ type:'listbox', name:'sel-actor-lb' });

const objectWin       = UI.add({ type:'window', name:'object-inspector', caption:'Object Inspector', position:new Vec2(2, 160), size: new Vec2(360, 480) });
const objectInspector = objectWin.add({ type:'keyvaluelist', name:'kvl' });

btPauseEngine.addEvent('click', _ => { 
    pauseEngine();            
});

btFiles.addEvent('click', async _ => {     
    const fs = await window.showOpenFilePicker({ multiple:true });
    
    /*
    const fs = await window.showDirectoryPicker();
    for await (const [key, value] of fs.entries()) {
        console.log(key, value);
    }

    */    
});

lbSelectActor.addEvent('select', (e) => { 
    if (e.item.data) editActor(e.item.data);    
});

cbShowColliders.addEvent('change', _ => { Engine.gameLoop.flags.showColliders = cbShowColliders.checked; });
cbShowBB.addEvent('change', _ => { Engine.gameLoop.flags.showBoundingBoxes = cbShowBB.checked; });

/**
 * Methods
 */

const editActor = (actor) => {
    console.log(actor);

    const props = Object.getOwnPropertyNames(actor);
    objectInspector.clear();
    for (const key of props) {        
        objectInspector.addItem({ key, value:actor[key] });
    }
}

const updateState = () => {
    cbShowColliders.checked = Engine.gameLoop.flags.showColliders;
    cbShowBB.checked = Engine.gameLoop.flags.showBoundingBoxes;
}

const installEventHandlers = () => {
    AE.addEvent(window, 'keyup', (e) => onKeyUp(e));		
    AE.addEvent(window, 'mouseup', (e) => onMouseUp(e));		
    AE.addEvent(window, 'mousedown', (e) => onMouseDown(e));		
    AE.addEvent(window, 'mousemove', (e) => onMouseMove(e));		
    setInterval(updateState, 1000);
}

/**
 * Pauses the gameloop and bypasses Engine mouse events to give access to DevTools
 */
const pauseEngine = () => {    
    if (Engine.gameLoop.isRunning) {
        Engine.flags.mouseEnabled = false;
        Controllers.disable();                     // TO-DO: cannot simply disable all controllers and then enable them: the user may have already disabled specific controllers and expects them to stay disabled after the engine resumes
        //console.log(Controllers);
    } else {
        Engine.flags.mouseEnabled = true;
        Controllers.enable();
    }
    Engine.gameLoop.isRunning = !Engine.gameLoop.isRunning;    
}

const onKeyUp = (e) => {
    if (Keys.stopEngine != '') {
        const sp = Keys.stopEngine.split('+');

        let condKey = false;
        if (sp[0] == 'Ctrl'  && e.ctrlKey)  condKey = true;
        if (sp[0] == 'Shift' && e.shiftKey) condKey = true;
        if (sp[0] == 'Alt'   && e.altKey)   condKey = true;

        let key = (e.key == ' ') ? 'Space' : '';
        
        if (condKey && sp[1] == key) { 
                // select actor
        } 
    }
}

const mousePosFromEvent = (e) => {
    const x = e.clientX / Engine.zoom - Engine.screen.left;
	const y = e.clientY / Engine.zoom - Engine.screen.top;			
    return Vec2.FromCoords(x, y);
}

/**
 * List of all actors in zOrder from bottom to top
 * @returns {[Actor]} Actors array
 */
const getActorZList = () => {
    const list = [];
    for (const layer of Engine.gameLoop.zLayers) for (const actor of layer) list.push(actor);
    return list;
}

const onMouseMove = (e) => {    
    if (lastClicked.actor && lastClicked.pos) {
        const delta = Engine.mousePos.clone().sub(mouseDownPos);
        lastClicked.actor.position.set(Vec2.Add(lastClicked.pos, delta));
    }
}

const onMouseUp = (e) => {
    mouseUpPos.set(Engine.mousePos);
    if (lastClicked.actor) lastClicked.pos = null;                
    
    //loopActors();
}

const onMouseDown = (e) => {    
    mouseDownPos  = mousePosFromEvent(e);

    if (!Engine.viewport.isPointInside(mouseDownPos)) return; // mouse click was not inside the Engine.screen
    keyDownActors = loopActors();

    // sort actors by zDepths
    const zList = getActorZList();
    keyDownActors.sort((a, b) => zList.indexOf(b) - zList.indexOf(a));

    // reset actorlist:
    lbSelectActor.clear();

    // see which actor is highest in z-order under mouse:
    if (keyDownActors.length > 0) {    
        for (const actor of keyDownActors) lbSelectActor.addItem({ text:'[' + actor.name + ']', data:actor });  // add all actors currently under mouse cursor in the UI listbox
        editActor(keyDownActors[0]);
    }
}

const loopActors = () => {
    if (!Engine.viewport.isPointInside(mouseDownPos)) return []; // mouse click was not inside the Engine.screen

    const found   = [];
    const oneShot = !Engine.gameLoop.flags.isRunning;

    for (const actor of Engine.gameLoop.actors) {        
        if (actor.AABB && actor.AABB.isPointInside(mouseDownPos)) {              
            found.push(actor);
            actor.onDrawBoundingBox();
        }
    }

    if (oneShot) Engine.gameLoop._oneShotRender = true;       // render one frame if the engine is currently paused

    return found;
}

Actor.prototype.onDrawBoundingBox = function() {
    const e = this;

    const p1  = new Vec2(-e.width / 2, -e.height / 2);			
    const p2  = new Vec2(e.width / 2, -e.height / 2);			
    const p3  = new Vec2(e.width / 2, e.height / 2);			
    const p4  = new Vec2(-e.width / 2, e.height / 2);

    const r   = e.transformPoints([p1, p2, p3, p4]);
    const smx = r.map(e => e.x);
    const smy = r.map(e => e.y);
    
    e.AABB    = new Types.Rect(Math.min(...smx), Math.min(...smy), Math.max(...smx), Math.max(...smy));
    
    // Reset transform. Actor.update() doesn't do it, because it assumes the gameLoop is running and next thing to be drawn is another Actor, which has its own transform.
    const s = Engine.renderingSurface;
    s.resetTransform();	
    
    s.drawCircle(r[0], 3, { stroke:'black', fill:'rgba(255,0,0,0.25)' });
    s.drawCircle(r[1], 3, { stroke:'black', fill:'rgba(255,0,0,0.25)' });
    s.drawCircle(r[2], 3, { stroke:'black', fill:'rgba(255,0,0,0.25)' });
    s.drawCircle(r[3], 3, { stroke:'black', fill:'rgba(255,0,0,0.25)' });

    // draw the bounding box!
    const stroke = (lastClicked.actor == e) ? 'black' : 'red';
    const fill   = (lastClicked.actor == e) ? 'rgba(255,255,0,0.25)' : null;
    s.drawRect(e.AABB, { stroke, fill });
    
    const mid = e.AABB.center;
    s.drawCircle(mid, 4, { stroke:'black' });        
    s.drawArrow(mid, { angle:e.rotation, length:50, sweep:0.85, head:0.2, width:1.5 }, 'black');

    s.textOut(mid, e.name || 'actor', { color:'black', font:'14px monospace' });
    s.textOut(Vec2.Sub(mid, Vec2.One()), e.name || 'actor', { color:'white', font:'14px monospace' });
}

class DevTools {
    /**
     * Draws actor bounding box on the Actor's default RenderingSurface
     * @param {Actor|string} actor Actor or Actor's name.
     */
    static EnableBoundingBox(actor) {
        if (typeof actor == 'string') var actor = Engine.gameLoop.findActorByName(actor);        
        actor.renderHints.showBoundingBox = true;
    }
}

installEventHandlers();

export { DevTools }
