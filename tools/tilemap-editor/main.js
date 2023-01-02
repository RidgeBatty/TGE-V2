import { Engine, World, Types } from '../../engine.js';
import { UWindow, UCustomList } from '../../ui/ui-html-components.js';
import { TilemapEditor } from './tilemapEditor.js';

const { Vector2 : Vec2, V2 } = Types;
let   editor;

const tick = (r) => {    
    AE.setText('coords', 'Position: ' + r.position.x.toFixed(0) + ':' + r.position.y.toFixed(0))
    AE.setText('tile-coords', 'Tile: ' + r.cursor.x + ':' + r.cursor.y)
}

const writeFile = async(file, content) => {
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
}

const saveMapToFile = async() => {
    try {
        let tiles = '[\n';
        for (let y of editor.map.tiles) {
            tiles += "\t'";
            for (let x = 0; x < y.length; x++) tiles += ("" + y[x]).padStart(2, '0') + ((x < y.length - 1) ? " " : "");
            tiles += "'\n";
        }
        tiles += ']\n';

        let textures = '', tex = editor.map.textures;
        for (let i = 0, t; t = tex[i], i < tex.length; i++) {            
            let filename = new URL(t.image.src).pathname.split('/').pop().split('.').shift();            
            textures += "'" + filename + ((i < tex.length - 1) ? "', " : "'");
        }

        let s = `type : 'tilemap'\nversion : '1.0'\ntexturePath : 'img/terrain/'\ntextureExt : '.png'\ntextures : [${textures}]\nobjects : {\n\timages : ['tree.png']\n\tlayers : {\n\t\t1 : [\n\t\t\t{ x:10, y:10, id:0 }\n\t\t]\n\t}\n}\ntileSize : 512,\ntiles : ${tiles}`;

        const file = await showSaveFilePicker({ types:[{ 
            description:'HJSON', 
            accept:{'application/hjson':['.hjson']} 
        }] });

        await writeFile(file, s);
    } catch (e) {
        console.error(e);
    }    
}

const clearMap = async() => {
    const result = await Confirmation({ caption:'⚠️ Clear Map', message:'Are you sure you want to delete all map data?' });
}

const keydown = async (e) => {
    e.event.preventDefault();    
    if (e.event.ctrlKey && e.code == 'KeyS') await saveMapToFile();
    if (e.event.ctrlKey && e.event.altKey && e.code == 'KeyC') await clearMap();
}

const main = async() => {
    Engine.setup('engine-setup.hjson');

    new World({ engine:Engine });            
    editor = new TilemapEditor({});
    await editor.init({ url:'./maps/level1.hjson', size:128 });

    const win  = new UWindow({ owner:Engine.ui, caption:'Select tile', position:V2(100, 10) });     // Create user interface
    const list = new UCustomList({ owner:win, type:'grid' });
    
    for (const t of editor.map.textures) list.add(t.image);
    list.events.add('selectitem', e => {
        editor.selectedTileIndex = e.index;
        ID('selected-tile').getElementsByTagName('img')[0].src = e.target.src;
    });

    Engine.events.add({ keydown: keydown });
    Engine.start(_ => tick(editor));
}

Engine.init(main);