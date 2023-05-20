import { Timeline } from "../timeline.js";
import { DATATYPES } from '../deserializer.js';
import { Serializer } from "./serializer.js";

/**
 *  If "onCustomData" callback function is specified, it is called for every item (timeline and keyframe). 
 *  If the user defined callback function returns "null", custom data is not attached.  
 *  Otherwise an array of objects is expected. Each object must contain "type" and "value" fields where "type" is a member of DATATYPES enum.
 */

export class TimelineEditor extends Timeline {
    constructor(o) {
        super(o);
    }
/*
    writeCustomData(d) {
        s.addValue(DATATYPES.INT8, (d == null) ? 0 : 1);           // write "1" to denote a custom data block, "0" NO custom data present
        if (d == null) return;
        if (!Array.isArray(d)) throw 'Custom data must be an array of objects.';
        for (const item of d) {
            if (!('type' in item) || !('value' in item)) throw 'Custom data ojects must have two fields: type and value';
            s.addValue(item.type, item.value);
        }
    }
*/
    serialize() {
        const s = new Serializer();
        s.addValue(DATATYPES.STR8,  'TGETIMELINE v01.00');

        s.addValue(DATATYPES.STR8,  this.name);                         // name of the timeline
        s.addValue(DATATYPES.STR8,  this.sourceType);                   // type of the frame source ('flipbook', 'atlas', 'images', 'video')
        s.addValue(DATATYPES.STR8,  this.sourceId);                     // id or name of the frame source
        s.addValue(DATATYPES.INT16, this.start);                        // starting keyframe
        s.addValue(DATATYPES.INT16, this.end);                          // ending keyframe
        s.addValue(DATATYPES.FLOAT32, this.FPS);                        // frames per second
        s.addValue(DATATYPES.UINT16, Number(this.loop));                // loop
        s.addValue(DATATYPES.UINT16, this.precision);                   // precision
        s.addValue(DATATYPES.INT32, this.playhead);                     // playhead position        

        s.addValue(DATATYPES.UINT16, this.track.length);                // how many keyframe slots we have?
        for (const position of this.track) {
            if (position == null) {
                s.addValue(DATATYPES.INT8, 0);                          // write "0" zLayers
                continue;
            }

            s.addValue(DATATYPES.INT8, position.length);                // number of zLayers            
            
            for (const zLayer of position) {
                if (zLayer == null) {
                    s.addValue(DATATYPES.INT8, 0);                      // write "0" to denote an empty layer
                    continue;
                }
                s.addValue(DATATYPES.INT8, 1);                          // write "1" (or any other positive number) to denote a used layer, this can be used as a flags register
      
                s.addValue(DATATYPES.INT16,   zLayer.index);
                s.addValue(DATATYPES.VECTOR2, zLayer.translate);
                s.addValue(DATATYPES.VECTOR2, zLayer.pivot);
                s.addValue(DATATYPES.FLOAT32, zLayer.angle);
                s.addValue(DATATYPES.FLOAT32, zLayer.scale);
                s.addValue(DATATYPES.FLOAT32, zLayer.opacity);
                s.addValue(DATATYPES.STR8,    zLayer.filter);
            }
        }        
        return s;
    }

    download(filename) {
        return this.serialize().download(filename);
    }
}