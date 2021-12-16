import { Engine, Actor, Types } from '../engine.js';
import { arraysEqual } from '../utils.js';
import Debug from '../tools/debug.js';

const Vec2 = Types.Vector2;

const Keys = {
    stopEngine : 'Ctrl+Space',
    showDebugLayer : 'Ctrl+d',
}

let keyDownActors = [],
    oldKeyDownActors = [],
    lastClicked   = { actor:null, index:-1 },
    mouseDownPos  = Vec2.Zero(),
    mouseUpPos    = Vec2.Zero();

AE.addEvent(window, 'keyup', (e) => onKeyUp(e), null);		
AE.addEvent(window, 'mouseup', (e) => onMouseUp(e), null);		
AE.addEvent(window, 'mousedown', (e) => onMouseDown(e), null);		
AE.addEvent(window, 'mousemove', (e) => onMouseMove(e), null);		

const onKeyUp = (e) => {
    if (Keys.stopEngine != '') {
        const sp = Keys.stopEngine.split('+');

        let condKey = false;
        if (sp[0] == 'Ctrl'  && e.ctrlKey)  condKey = true;
        if (sp[0] == 'Shift' && e.shiftKey) condKey = true;
        if (sp[0] == 'Alt'   && e.altKey)   condKey = true;

        let key = (e.key == ' ') ? 'Space' : '';
        
        if (condKey && sp[1] == key) {            
            Engine.gameLoop.isRunning = !Engine.gameLoop.isRunning;
        }        
    }
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
    
    loopActors();
}

const onMouseDown = (e) => {
    mouseDownPos.set(Engine.mousePos);
    keyDownActors = loopActors();
 
    // sort actors by zDepths
    const zList = getActorZList();
    keyDownActors.sort((a, b) => zList.indexOf(a) - zList.indexOf(b));      

    // see which actor is highest in z-order under mouse:
    if (keyDownActors.length > 0) {
        let index = 0;
        if (arraysEqual(oldKeyDownActors, keyDownActors)) index = lastClicked.index - 1;             // arrays are equal, decrement the last selection
            else index = keyDownActors.length - 1;                                                         // arrays not equal, start from top of the list
        
        if (index > -1) {            
            const actor = keyDownActors[index];
            if (actor) {
                lastClicked = {
                    actor,
                    index,
                    pos: actor.position.clone()
                }
            }
        } else
            lastClicked = {
                actor: null,
                index: -1,
                pos: null
            }
        
        if (lastClicked.actor) console.log(lastClicked.actor.name);
            else console.log('<NONE>');
    }

    oldKeyDownActors = [...keyDownActors];
    keyDownActors    = [];
}

const loopActors = () => {
    const found   = [];
    const oneShot = !Engine.gameLoop.flags.isRunning;

    for (const actor of Engine.gameLoop.actors) {
        if (actor.AABB && actor.AABB.isPointInside(Engine.mousePos)) {             
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
    s.drawArrow(mid, { angle:e.rotation, length:50, sweep:0.85, head:0.2, width:3 }, 'black');

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

export { DevTools }
