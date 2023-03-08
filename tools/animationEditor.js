import { Flipbook } from "../flipbook.js"
import { Texture } from "../texture.js";
import { downloadFile } from "../utils.js";

export class AnimationEditor extends Flipbook {
    constructor(o) {
        super(o);
    }

    /**
     * 
     * @param {object} sequences Flipbook sequences object (does not have to be AnimationEditors' sequences, can be any Flipbook!)
     * @param {*} dims 
     * @param {*} order 
     */
    convertFramesToAtlas(sequences, dims, order = 'sequence-per-row') {
        let atlas;
        const frames = [];
        if (order == 'sequence-per-row') {
            let y = 0;
            let atlasWidth = 0;
            
            for (const s of Object.values(sequences)) {
                let x = 0, tallest = 0;                
                for (let i = s.start; i <= s.end; i++) {
                    const img = s.flipbook.images[i];
                    frames.push({ x, y, img });

                    x += img.width || img.naturalWidth;
                    const h = img.height || img.naturalHeight;
                    if (h > tallest) tallest = h;
                }
                if (x > atlasWidth) atlasWidth = x;
                y += tallest;                
            }

            atlas = new Texture('atlas', { width:atlasWidth, height:y });            
            for (const f of frames) atlas.ctx.drawImage(f.img, f.x, f.y);                           // draw the frames on the atlas' canvas                            
        }
        return atlas;
    }

    downloadAtlasAsFile(atlas, filename = 'atlas.png', type = 'image/png', quality = 1) {
        atlas.canvas.convertToBlob({ type, quality }).then(blob => downloadFile(filename, blob));
    }
}
