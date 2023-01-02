/*

    UI Components

*/
import { Engine, Types } from '../../engine.js';
import { CanvasSurface } from '../../canvasSurface.js';
import { CustomLayer } from '../../customLayer.js';
import { AngleWidget } from '../../ui/ui-angleWidget.js';
import { UIComponents } from '../../ui/ui-html.js';
import { FS } from '../filesystem-agent.js';
import { addPropertyListener, preloadImages, remove } from '../../utils.js';

const { Vector2 : Vec2, V2, Rect } = Types;
const { UWindow, UCustomList, Confirmation } = UIComponents;

const editor = {    
    toolInfo        : '',
    actorFilename   : '/assets/img/fort1.png',
    actor           : null,       
    mode            : null, 
    mousePos        : Vec2.Zero(),
    mouseOnCanvas   : false,             // set to TRUE if mouse pointer is on canvas element (not on UI elements)
    editedCollider  : null,              // pointer to edited collider (which is also part of colliders list)
    colliders       : [],                // list of saved colliders
    angleWidget     : null,
    colliderListbox : null,    
    cwdImages       : null,
    cwdSave         : null,
    colliderFilename: 'colliders.hjson',
    fileSystem      : null,
    selected        : null,
    lineDashOfs     : 0,
    savePrecision   : 3,                 // use 3 digits of precision when saving to file numerical data to disk
}

const onNetworkError = async(e) => {
    console.error('Network failure');
    const result = await Confirmation({ caption:'⚠️ Networking Error', message:'Make sure TGE-Agent server is running.', buttons:['Reload'] });    
    if (result == 'Reload') location.reload();
        else throw 'Stop';
}

const clearMap = async() => {
    const result = await Confirmation({ caption:'⚠️ Clear All', message:'Are you sure you want to delete all colliders?' });    
    if (result) resetEditor();    
}

const saveToFile = async () => {
    let saveWin = Engine.ui.findByName('save-window');
    
    const onSave = async() => {
        editor.colliders = editor.colliders.filter(c => c.complete);
        const data = editor.colliders.map(c => {             
            const copy = structuredClone(c);
            copy.points.forEach(e => { 
                e.x = +(e.x - Engine.dims.x * 0.5).toFixed(editor.savePrecision); 
                e.y = +(e.y - Engine.dims.y * 0.5).toFixed(editor.savePrecision) 
            });
            delete copy.complete; 
            return copy; 
        });

        const result = await editor.fileSystem.saveFile({ 
            filename: Engine.ui.findByName('save-filename').value, 
            data: Hjson.stringify({ version:'1.0', type:'TGE-Actor-Collider-Data', actor:editor.actor.name, data }) 
        });  
        const fileList = saveWin.findByName('save-files', true); 
        if (fileList) await fileList.update();
        
        saveWin.close();
    }

    if (saveWin == null) saveWin = await makeSaveCollidersWindow(onSave);
        else saveWin.show();    
}

const resetEditor = (clearColliders = true) => {
    if (clearColliders) editor.colliders.length = 0;
    editor.editedCollider = null;
    editor.mode = null;

    Engine.ui.findByName('create-collider').clearSelection();
    
    editor.toolInfo = '';
}

const createNewCollider = (type) => {
    editor.colliders = editor.colliders.filter(c => c.complete);

    if (type == 'poly')   editor.toolInfo = 'Polygon';
    if (type == 'box')    editor.toolInfo = 'Box';
    if (type == 'circle') editor.toolInfo = 'Circle';

    editor.editedCollider = null;                                                           // remove the edited object

    if (editor.mode != null) {                                                              // new object                                        
        ID('game').style.cursor = 'crosshair';
        editor.editedCollider = { type:editor.mode, points:[], complete:false };
        editor.colliders.push(editor.editedCollider);            
    }                    
}

const deleteSelectedCollider = () => {
    if (!editor.selected) return;
    remove(editor.colliders, e => e == editor.selected);
    editor.colliderListbox.remove(editor.selected);
    editor.selected = null;
}

/* ----------------------------------------------------------------------------

    UI components

   ---------------------------------------------------------------------------- */

// window: select collider
const makeColliderWindow = async () => {    
    const winColliders  = new UWindow({ owner:Engine.ui, caption:'Create collider', position:V2(10, 10) });     
    const collidersList = new UCustomList({ owner:winColliders, name:'create-collider', type:'grid' });

    const images = ['box', 'circle', 'poly'].map(e => { return { src:'/assets/img/editor/' + e + '.png', data:{ type:e } } });
    collidersList.add(images);
    
    collidersList.events.add('selectitem', async e => {
        const s = collidersList.selectedItem;                
        editor.mode = s ? s.data.type : null;
        if (editor.mode == null) resetEditor(false); 
            else createNewCollider(editor.mode);
    });          
}

// window: images
const makeImagesWindow = async (data) => {  
    data.passive[0].components[0].fileSystem = editor.fileSystem;
    const winFiles = Engine.ui.createComponent(Engine.ui, data.passive[0]);    
    const files    = winFiles.findByName('files', true);    
    await files.init();
        
    files.events.add('selectitem', async e => {        
        if (!e.data) return;
        if (e.data.kind == 'file') {
            console.log('Downloading:', e.data.name);
            const file = await files.fileSystem.loadFile(e.data.name);
            await editor.actor.imageFromFile(file);      
            
            editor.cwdImages     = files.currentDir;
            editor.actorFilename = e.data.name;
            editor.toolInfo      = editor.toolInfo;
        }        
    });
}

// window: save colliders
const makeSaveCollidersWindow = async (onSave) => {    
    Engine.ui._loadedData.passive[1].components[1].fileSystem = editor.fileSystem;
    const saveWin  = Engine.ui.createComponent(Engine.ui, Engine.ui._loadedData.passive[1]); 
    const files    = saveWin.findByName('save-files', true); 
    await files.init();

    saveWin.findByName('bt-save').events.add('click', onSave);    

    return saveWin;
}

// window: collider list
const makeColliderListWindow = () => {
    const colliderList     = new UWindow({ owner:Engine.ui, caption:'Collider List', position:V2(900, 300), name:'collider-list' });    // window: images
    editor.colliderListbox = new UCustomList({ owner:colliderList, type:'row' });   

    editor.colliderListbox.events.add('selectitem', (e) => {
        const collider  = editor.colliders.find(c => c == e.data);
        editor.selected = collider;
    });
}

/* ----------------------------------------------------------------------------

    Keyboard and mouse handling

   ----------------------------------------------------------------------------*/
const keydown = async (e) => {  
    if (Engine.ui.active && Engine.ui.active.modal) return;

    if (e.event.ctrlKey && e.code == 'KeyS') await saveToFile();
    if (e.event.ctrlKey && e.code == 'KeyC') await clearMap();
    if (e.event.ctrlKey && e.code == 'Delete') deleteSelectedCollider();
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
            const div = editor.colliderListbox.add({ caption:editor.mode, data:editor.editedCollider });
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
            const div = editor.colliderListbox.add({ caption:editor.mode, data:editor.editedCollider });
            div.textContent = editor.mode;

            points.push(e.position);            
            createNewCollider(editor.mode);
        }
    }    
}

/* ----------------------------------------------------------------------------

    Drawing graphics

   ----------------------------------------------------------------------------*/
const drawCollider = (s, collider, points, stroke, alpha) => {
    if (collider.type == 'poly') s.drawPoly(points, { stroke:stroke[0], fill:`rgba(255,0,0,${alpha})` });
    if (collider.type == 'box'    && points.length > 1)  s.drawRect(Rect.FromArray([points[0].x, points[0].y, points[1].x, points[1].y]), { stroke:stroke[1], fill:`rgba(0,0,255,${alpha})` });
    if (collider.type == 'circle' && points.length > 1)  s.drawCircle(points[0], Vec2.Distance(points[0], points[1]), { stroke:stroke[2], fill:`rgba(0,255,0,${alpha})` });
}

const updateColliders = () => {
    const s = Engine.renderingSurface;                
    s.resetTransform();

    let alpha = 0.1;
    for (const collider of editor.colliders) {                                                          // draw all colliders (except selected) 
        if (collider == editor.selected) continue;        
        const points = (collider == editor.editedCollider && editor.mode != null) ? [...collider.points, editor.mousePos] : collider.points;                    
        drawCollider(s, collider, points, ['red','blue','lime'], alpha);        
    }

    if (editor.selected) {                                                                              // draw selected collider 
        s.ctx.setLineDash([8, 4]);         
        drawCollider(s, editor.selected, editor.selected.points, ['white','white','white'], 0.2);
        s.ctx.setLineDash([]); 
    }        
    
    s.ctx.lineDashOffset = -editor.lineDashOfs;                                                         // marching ants
    editor.lineDashOfs++;
    if (editor.lineDashOfs > 22) editor.lineDashOfs = 0;

    /*
    if (editor.mode != null && editor.mouseOnCanvas) {                                                  // draw crosshair
        const m = editor.mousePos;
        s.drawLine(V2(0, m.y), V2(Engine.dims.x, m.y), { stroke:'rgba(255,255,255,0.5)'});
        s.drawLine(V2(m.x, 0), V2(m.x, Engine.dims.y), { stroke:'rgba(255,255,255,0.5)'});
    }
    */
}

/* ----------------------------------------------------------------------------

    Main entry point

   ----------------------------------------------------------------------------*/
const createUI = async() => {        
    addPropertyListener(editor, 'toolInfo', (e) => {
        console.log(editor.actor);
        ID('tool-info').textContent = e + ' [' + editor.actorFilename + ']';
    });

    if (localStorage['TGE-Collider-Editor']) {
        const o = JSON.parse(localStorage['TGE-Collider-Editor']);
        editor.cwdImages = o.cwdImages;
        editor.cwdSave   = o.cwdSave;
    }
    editor.fileSystem    = FS(null, onNetworkError);

    await Engine.ui.loadFromFile('./collider-uic.hjson');

    makeColliderWindow();
    makeImagesWindow(Engine.ui._loadedData);
    makeColliderListWindow();
    

    Engine.renderingSurface.ctx.imageSmoothingEnabled = false;
	Engine.renderingSurface.ctx.imageSmoothingQuality = 'low';

    editor.actor       = Engine.gameLoop.add('actor', { position:Engine.dims.mulScalar(0.5).sub(V2(0, 200)), imgUrl:editor.actorFilename, scale:2 });    
    editor.angleWidget = new AngleWidget({ position:V2(100, Engine.dims.y - 100), radius:80, actor:editor.actor });
    
    const layer        = new CustomLayer({ addLayer:true, zIndex:2 });     // draw the colliders on a custom layer:
    layer.update       = updateColliders;
    
    Engine.events.add({ keydown, mousemove, mousedown, mouseup });

    return editor;
}

export { createUI }