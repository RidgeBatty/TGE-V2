import * as TGE from '../../engine.js';
import { ParticleEditor } from './particle-editor.js';

const Engine = TGE.Engine;
const Vec2   = TGE.Types.Vector2;
const PE = new ParticleEditor();
const types = [{
    description: 'JSON/HJSON',
    accept: {'application/json': ['.json', '.hjson']},
}];
let   saveHandle;
const resize = {
    downPos : TGE.Types.Vector2,
    down    : false,
}

const main = async () => {
    Engine.setRootElement('game');              
    Engine.setFlags({ hasEdges:false, hasRenderingSurface:true, preventKeyDefaults:false });
    Engine.preventedKeys = Object.assign({}, { 'F5':true })
    Engine.gameLoop.clearColor = 'black';

    const d = await PE.loadFromFile('shape-emitter.hjson');
    ID('editor').textContent = PE._text;

    AE.addEvent(ID('color'), 'change', (e) => { Engine.gameLoop.clearColor = e.target.value; });
    AE.addEvent(ID('bt-panel'), 'click', async (e) => { 
        const t = e.target.textContent;
        if (t == 'Font +') ID('editor').style.fontSize = (parseInt(getComputedStyle(ID('editor')).fontSize, 10) + 1) + 'px';
        if (t == 'Font -') ID('editor').style.fontSize = (parseInt(getComputedStyle(ID('editor')).fontSize, 10) - 1) + 'px';
        if (t == 'Pause') Engine.gameLoop.flags.isRunning = !Engine.gameLoop.flags.isRunning;
        if (t == 'Step') Engine.gameLoop.step();
        if (t == 'Save As...') { saveHandle = await saveToFile(ID('editor').value); ID('filename').textContent = saveHandle.name; }
        if (t == 'Save') { await saveToFile(ID('editor').value, saveHandle); }
        if (t == 'Load') { const file = await getFromFile(); console.log('Loaded file:', file.handle.name); if (file) ID('editor').value = file.data; saveHandle = file.handle; ID('filename').textContent = file.handle.name; compile(); }
        if (t == 'Clear') { ID('editor').value = ''; }
    });
    AE.addEvent(ID('divider'), 'mousedown', async (e) => {    
        resize.downPos = new Vec2(e.clientX, e.clientY);       
        resize.down    = true;
    });
    AE.addEvent(window, 'keyup', async (e) => updateCaretPos());
    AE.addEvent(window, 'mouseup', async (e) => { if (resize.down) Engine._onResizeWindow(); resize.down = false; updateCaretPos();});
    AE.addEvent(window, 'mousemove', async (e) => {         
        if (resize.down) {
            const delta = Vec2.Sub(new Vec2(e.clientX, e.clientY), resize.downPos);
            ID('editor-frame').style.width = ID('editor-frame').offsetWidth + delta.x + 'px';
            resize.downPos = new Vec2(e.clientX, e.clientY);              
        }
    });
    AE.addEvent(ID('divider'), 'mousedown', async (e) => {         
        resize.downPos = new Vec2(e.clientX, e.clientY);       
        resize.down    = true;
    });
    AE.addEvent(ID('editor'), 'input', (e) => compile());

    Engine.start();
}     

const updateCaretPos = () => {
    const lines = ID('editor').value.split('\n');
    const s = ID('editor').selectionStart;
    let pos  = 0;
    let lnum = 0;
    let pl   = 0;
    for (const l of lines) {
        const col = (s - pos - l.length);
        
        if (s < pos) { 
            console.log(s - pos + pl - lnum + 1)
            ID('caretpos').textContent = col + ':' + lnum; return 
        }
        pl = l.length;
        pos += l.length;
        //console.log(s, pos - l.length)
        
        lnum++;
    }
    //ID('caretpos').textContent =     
}

const compile = () => {
    console.log('Compiling...');
    const f = PE.fromEditorContent(ID('editor').value);
    if (f != null) {                                                    // compile error
        const t = String(f);
        ID('statusbar').textContent = t.substring(0, t.indexOf('>>>'));
    } else
        ID('statusbar').textContent = '';
}

/**
 * WARNING! File System Access API is non-standard. Works only in Chrome & Edge browsers (4 Jan 2022).
 * Opens a save file system dialog and writes the params string "data" into the file.
 * @param {USVString} data 
 */
async function saveToFile(data, handle) {    
    const opts = { types }
    if (handle == null) handle = await window.showSaveFilePicker(opts);
    const writableStream = await handle.createWritable();
    await writableStream.write({ type:'write', position:0, data });
    await writableStream.close();    
    return handle;
}

/**
 * WARNING! File System Access API is non-standard. Works only in Chrome & Edge browsers (4 Jan 2022).
 * Presents an open file system dialog and loads a file from disk.
 */
async function getFromFile() {
    const pickerOpts = {
        types,
        excludeAcceptAllOption: true,
        multiple: false
    }
    const fileHandles = await window.showOpenFilePicker(pickerOpts);
    if (fileHandles.length == 1) {
        const contents = await fileHandles[0].getFile();            
        const data     = await contents.text();
        return { data, handle:fileHandles[0] }
    }
}

Engine.init(main);