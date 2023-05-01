import { Timeline } from "../timeline.js";
import { DATATYPES } from '../deserializer.js';
import { Serializer } from "./serializer.js";

export class TimelineEditor extends Timeline {
    constructor(o) {
        super(o);
    }

    serialize(customData = '') {
        const s = new Serializer();
        s.addValue(DATATYPES.STR8,  'TGETIMELINE v01.00');

        s.addValue(DATATYPES.STR8,  this.name);                         // name of the timeline
        s.addValue(DATATYPES.INT16, this.start);                        // starting keyframe
        s.addValue(DATATYPES.INT16, this.end);                          // ending keyframe
        s.addValue(DATATYPES.FLOAT32, this.FPS);                        // frames per second
        s.addValue(DATATYPES.UINT16, Number(this.loop));                // loop
        s.addValue(DATATYPES.UINT16, this.precision);                   // precision
        s.addValue(DATATYPES.INT32, this.playhead);                     // playhead position        

        s.addValue(DATATYPES.INT8, customData == '' ? 0 : 1);           // write "1" to denote a custom data block, "0" NO custom data present
        if (customData != '') s.addValue(DATATYPES.STR16, customData);        

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
      
                s.addValue(DATATYPES.VECTOR2, zLayer.translate);
                s.addValue(DATATYPES.VECTOR2, zLayer.pivot);
                s.addValue(DATATYPES.FLOAT32, zLayer.angle);
                s.addValue(DATATYPES.FLOAT32, zLayer.scale);
                s.addValue(DATATYPES.FLOAT32, zLayer.opacity);
                s.addValue(DATATYPES.STR8, zLayer.filter);
            }
        }        
        return s;
    }

    download(filename) {
        return this.serialize().download(filename);
    }
}