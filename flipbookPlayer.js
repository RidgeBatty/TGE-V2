export const defaultFlipbookPlayer = function(c) {	
    const frames = [];

    for (const fb of this.flipbooks) { 
        const n = fb.customRender;		                
        if (n.img) {
            const s = fb.sequence;
            let z = 0;
            z = (s?.zOrder && Array.isArray(s.zOrder)) ? s.zOrder[~~s.frameIndex] : s.zOrder;                    
            frames.push({ fb, n, z, index:~~s.frameIndex, seq:s });
        }
    }

    frames.sort((a, b) => a.z - b.z);                                     // sort all overlaid frames (to form the final composite) according to their z-value
    
    for (const frame of frames) {
        const { n, fb, index, seq } = frame;
        const { rotation, scale, origin, size, offset, renderHints, renderPosition } = this;			
        
        size.x = n.w;
        size.y = n.h;

        const x  = (seq.ofs.length > 0) ? seq.ofs[index * 2 + 0] : 0;
        const y  = (seq.ofs.length > 0) ? seq.ofs[index * 2 + 1] : 0;
        
        c.setTransform((renderHints.mirrorX ? -1 : 1) * scale, 0, 0, (renderHints.mirrorY ? -1 : 1) * scale, renderPosition.x + offset.x + x, renderPosition.y + offset.y + y);
        c.rotate(rotation);
        if (seq.rot.length > 0) {
            const rx = (seq.rot.length > 0) ? seq.rot[index * 3 + 0] : 0;
            const ry = (seq.rot.length > 0) ? seq.rot[index * 3 + 1] : 0;
            const r  = (seq.rot.length > 0) ? seq.rot[index * 3 + 2] : 0;
            c.translate(rx, ry);
            c.rotate(r);
            c.translate(-rx, -ry);
        }
        c.translate(size.x * origin.x, size.y * origin.y);

        if (fb.isAtlas) {						                                        // atlas
            c.drawImage(n.img, n.a * n.w, n.b * n.h, n.w, n.h, 0, 0, n.w, n.h);                    
        } else {                                                                        // NOT Atlas - the flipbook contains an array of images
            if (n.img.isCanvasSurface) c.drawImage(n.img.canvas, 0, 0);							
                else c.drawImage(n.img, 0, 0);                
        }
    }
}