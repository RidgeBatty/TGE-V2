/*

    UI Components

*/
import { Engine, Types } from '../../engine.js';
import { CanvasSurface } from '../../canvasSurface.js';
import { CustomLayer } from '../../customLayer.js';
import { AngleWidget } from '../../ui/ui-angleWidget.js';
import { UWindow, UCustomList, Confirmation, UFileList } from '../../ui/ui-html.js';

const { Vector2 : Vec2, V2, Rect } = Types;

const editor = {
    actor       : null,       
    mode        : null, 
    mousePos    : Vec2.Zero(),
    mouseOnCanvas  : false,             // set to TRUE if mouse pointer is on canvas element (not on UI elements)
    editedCollider : null,              // pointer to edited collider (which is also part of colliders list)
    colliders   : [],                     // list of saved colliders
    window      : null,
    angleWidget : null,
    colliderListbox : null,
}

const writeFile = async(file, content) => {
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();    
}

const clearMap = async() => {
    const result = await Confirmation({ caption:'⚠️ Clear All', message:'Are you sure you want to delete all colliders?' });    
    if (result) resetEditor();    
}

const saveToFile = async () => {
    editor.colliders = editor.colliders.filter(c => c.complete);
    const data = editor.colliders.map(c => { const copy = Object.assign({}, c); delete copy.complete; return copy; });
    const file = await showSaveFilePicker({ types:[{ description:'HJSON', accept:{'application/hjson':['.hjson']} }] });    
    await writeFile(file, Hjson.stringify({ version:'1.0', type:'TGE-Actor-Collider-Data', actor:editor.actor.name, data }));    
}

const resetEditor = (clearColliders = true) => {
    if (clearColliders) editor.colliders.length = 0;
    editor.editedCollider = null;
    editor.mode = null;
    editor.window.findByName('collider-list').clearSelection();
    
    ID('tool-info').textContent = '';
}

const createNewCollider = (type) => {
    editor.colliders = editor.colliders.filter(c => c.complete);

    if (type == 'poly')   ID('tool-info').textContent = 'Polygon';
    if (type == 'box')    ID('tool-info').textContent = 'Box';
    if (type == 'circle') ID('tool-info').textContent = 'Circle';

    editor.editedCollider = null;                                                           // remove the edited object

    if (editor.mode != null) {                                                              // new object                                        
        ID('game').style.cursor = 'crosshair';
        editor.editedCollider = { type:editor.mode, points:[], complete:false };
        editor.colliders.push(editor.editedCollider);            
    }                    
}

/* ----------------------------------------------------------------------------

    UI components

   ---------------------------------------------------------------------------- */
const createColliderShapes = (list) => {
    const circle = new CanvasSurface({ dims:V2(64, 64) });
    circle.drawCircle(V2(31, 31), 24, { stroke:'navy', fill:'blue' });
    list.add(circle.toImage(), { type:'circle' });

    const box = new CanvasSurface({ dims:V2(64, 64) });
    box.drawRectangle(7,7,48,48, { stroke:'navy', fill:'blue' });
    list.add(box.toImage(), { type:'box' });

    const poly = new CanvasSurface({ dims:V2(64, 64) });
    poly.drawPoly([V2(8,8),V2(20,48),V2(56,32),V2(32,32)], { stroke:'navy', fill:'blue' });
    list.add(poly.toImage(), { type:'poly' });
}

const makeColliderWindow = () => {
    const winColliders  = new UWindow({ owner:Engine.ui, caption:'Select collider', position:V2(10, 10) });     // window: select collider
    const collidersList = new UCustomList({ owner:winColliders, name:'collider-list', type:'grid' });
    createColliderShapes(collidersList);
    
    collidersList.addEvent('clickitem', async e => {
        const s = collidersList.selectedItem;                
        editor.mode = s ? s.data.type : null;                

        if (editor.mode == null) resetEditor(false);
            else createNewCollider(editor.mode);
    });  
    
    editor.window = winColliders;
}

const makeImagesWindow = () => {
    const winFiles      = new UWindow({ owner:Engine.ui, caption:'Images', position:V2(900, 10) });            // window: images
    const files         = new UFileList({ owner:winFiles });
    files.addHeader('Name', 'Size', 'Type');
    files.addEvent('selectitem', async e => {
        if (e.data && e.data.kind == 'file') {
            const file = await e.data.getFile();                        
            editor.actor.imageFromFile(file);
        }
    });
}

const makeColliderListWindow = () => {
    const colliderList     = new UWindow({ owner:Engine.ui, caption:'Collider List', position:V2(900, 300) });            // window: images
    editor.colliderListbox = new UCustomList({ owner:colliderList });
}


/* ----------------------------------------------------------------------------

    Keyboard and mouse handling

   ----------------------------------------------------------------------------*/
const keydown = async (e) => {
    e.event.preventDefault();    
    if (e.event.ctrlKey && e.code == 'KeyS') await saveToFile();
    if (e.event.ctrlKey && e.event.altKey && e.code == 'KeyC') await clearMap();
}

const mousemove = (e) => {
    editor.mouseOnCanvas = (e.target == Engine.renderingSurface.canvas && !editor.angleWidget.hover);
    if (editor.mode) editor.mousePos = e.position;
}

const mousedown = (e) => {
    if (Engine.ui.active != null || !editor.mode || !editor.mouseOnCanvas) return;

    const points = editor.editedCollider.points;
    if (e.button == 0) {                                                                        // left click: create new collider or add more points into an existing one
        if (editor.mode == 'poly') return points.push(e.position);
        if ((editor.mode == 'box' || editor.mode == 'circle') && points.length == 0) return points.push(e.position);            
    }
    if (e.button == 2) {                                                                        // right click terminates polygon
        if (editor.mode == 'poly') { 
            editor.editedCollider.complete = true;
            const div = editor.colliderListbox.add('div', editor.editedCollider);
            div.textContent = editor.mode;
            return createNewCollider(editor.mode);                
        }            
    }
}

const mouseup = (e) => {    
    if (Engine.ui.active != null || !editor.mode) return;
    const points = editor.editedCollider.points;

    if (e.button == 0) {  
        if (points.length == 1 && (editor.mode == 'box' || editor.mode == 'circle')) {
            if (Vec2.IsEqual(points[0], e.position)) return;                                    // Start and end points in the place location, create action ignored!                
            
            editor.editedCollider.complete = true;
            const div = editor.colliderListbox.add('div', editor.editedCollider);
            div.textContent = editor.mode;

            points.push(e.position);            
            createNewCollider(editor.mode);
        }
    }    
}

/* ----------------------------------------------------------------------------

    Main entry point

   ----------------------------------------------------------------------------*/
const createUI = () => {    
    makeColliderWindow();
    makeImagesWindow();
    makeColliderListWindow();
    
    editor.angleWidget = new AngleWidget({ position:V2(100, Engine.dims.y - 100), radius:80, actor:editor.actor });
    editor.actor       = Engine.gameLoop.add('actor', { position:Engine.dims.mulScalar(0.5), imgUrl:'../../../img/naval/fort1.png', name:'Fort1' });    

    const layer   = new CustomLayer({ addLayer:true, zIndex:2 });                                               // draw the colliders on a custom layer:
    layer.update = () => {
        const s = Engine.renderingSurface;                
        s.resetTransform();

        for (const collider of editor.colliders) {
            const points = (collider == editor.editedCollider && editor.mode != null) ? [...collider.points, editor.mousePos] : collider.points;            

            if (collider.type == 'poly') s.drawPoly(points, { stroke:'red', fill:'rgba(255,0,0,0.3)' });
            if (collider.type == 'box'    && points.length > 1)  s.drawRect(Rect.FromArray([points[0].x, points[0].y, points[1].x, points[1].y]), { stroke:'blue', fill:'rgba(0,0,255,0.3)' });
            if (collider.type == 'circle' && points.length > 1)  s.drawCircle(points[0], Vec2.Distance(points[0], points[1]), { stroke:'green', fill:'rgba(0,255,0,0.3)' });
        }

        if (editor.mode != null && editor.mouseOnCanvas) {                                  // draw crosshair
            const m = editor.mousePos;
            s.drawLine(V2(0, m.y), V2(Engine.dims.x, m.y), { stroke:'rgba(255,255,255,0.5)'});
            s.drawLine(V2(m.x, 0), V2(m.x, Engine.dims.y), { stroke:'rgba(255,255,255,0.5)'});
        }
    }
    
    Engine.events.add({ keydown, mousemove, mousedown, mouseup });
    // get initial user interaction:
    // const oneTime = AE.addEvent('game', 'click', () => { AE.removeEvent('game', 'click', oneTime); files.init(); });

    return editor;
}

export { createUI }