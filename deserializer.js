import { Vector2 } from "./types.js";

export const DATATYPES = {    
    STR8    : 1,
    STR16   : 2,
    STR24   : 3,
    STR32   : 4,
    INT8    : 5,
    UINT8   : 6,
    INT16   : 7,
    UINT16  : 8,
    INT32   : 9,
    UINT32  : 10,
    FLOAT32 : 11,
    VECTOR2 : 12,

    ARRAY   : 128,    
}

export class Deserializer {
    constructor(o) {
        this.method = 'bin8';        
        this.output = '';
        this.data   = ('data' in o) ? o.data : new Uint8Array(1);
        this.offset = 0;

        this.scrambleBytes = [33, 55, 22, 11, 7];
        
        this.reallocations = 0;                                                             // number of reallocations
        this.blockSize     = 0;                                                             // block size of last reallocation
        this.maxBlockSize  = 16384;                                                         // default stategy keeps doubling the buffer size until maxBlockSize is reached
    }

    // -------------------------------------- decode stuff
    decodeByte() {        
        const v = this.data[this.offset] ^ this.scrambleBytes[this.offset % this.scrambleBytes.length];
        this.offset++;
        return v;
    }

    getInt8() {
        return this.decodeByte() << 24 >> 24;
    }

    getUint8() {
        return this.decodeByte();
    }

    getInt16() {
        return ((this.decodeByte() << 8) + this.decodeByte()) << 16 >> 16;
    }

    getUint16() {
        return ((this.decodeByte() << 8) + this.decodeByte());
    }

    getInt32() {
        return ((this.decodeByte() << 24) + (this.decodeByte() << 16) + (this.decodeByte() << 8) + this.decodeByte()) >> 0;
    }

    getUint32() {
        return ((this.decodeByte() << 24) + (this.decodeByte() << 16) + (this.decodeByte() << 8) + this.decodeByte()) >>> 0;
    }

    getFloat32() {        
        const v   = new ArrayBuffer(4);        
        const buf = new DataView(v);

        buf.setInt8(0, this.decodeByte());
        buf.setInt8(1, this.decodeByte());
        buf.setInt8(2, this.decodeByte());
        buf.setInt8(3, this.decodeByte());

        return buf.getFloat32();
    }

    getVector2() {        
        return new Vector2(this.getFloat32(), this.getFloat32());
    }

    getStr8() {
        const len = this.decodeByte();    
        const buf = new Int8Array(len);        
        for (let i = 0; i < len; i++) buf[i] = this.decodeByte();
        return new TextDecoder("utf-8").decode(buf);        
    }

    getStr16() {
        const len = this.getUint16();        
        const buf = new Int8Array(len);
        for (let i = 0; i < len; i++) buf[i] = this.decodeByte();
        return new TextDecoder("utf-8").decode(buf);        
    }

    getArray(arrayType) {
        const len = this.getUint32();
        const res = [];
        if (arrayType == DATATYPES.INT8)    for (let i = 0; i < len; i++) res.push(this.getInt8()); else
        if (arrayType == DATATYPES.INT16)   for (let i = 0; i < len; i++) res.push(this.getInt16()); else
        if (arrayType == DATATYPES.INT32)   for (let i = 0; i < len; i++) res.push(this.getInt32()); else   
        if (arrayType == DATATYPES.FLOAT32) for (let i = 0; i < len; i++) res.push(this.getFloat32()); else
            throw 'Unsupported array type: ' + arrayType;     
        return res;
    }

    /**
     * Decodes an array of bytes
     * @param {object} o 
     * @param {Uint8Array} o.data TypedArray (Uint8Array)
     * @param {number} o.offset Optional. Set serializer offset.
     */
    decode(o = {}) {
        this.offset    = ('offset' in o) ? o.offset : this.offset;
        this.data      = ('data' in o) ? o.data : this.data; 
        
        if (this.offset >= this.data.length) return null;

        const type = this.decodeByte();
        
        if (type == DATATYPES.STR8)    return { data:this.getStr8(),    type };
        if (type == DATATYPES.STR16)   return { data:this.getStr16(),   type };
        if (type == DATATYPES.INT8)    return { data:this.getInt8(),    type };
        if (type == DATATYPES.INT16)   return { data:this.getInt16(),   type };
        if (type == DATATYPES.INT32)   return { data:this.getInt32(),   type };
        if (type == DATATYPES.UINT8)   return { data:this.getUint8(),   type };
        if (type == DATATYPES.UINT16)  return { data:this.getUint16(),  type };
        if (type == DATATYPES.UINT32)  return { data:this.getUint32(),  type };
        if (type == DATATYPES.FLOAT32) return { data:this.getFloat32(), type };
        if (type == DATATYPES.VECTOR2) return { data:this.getVector2(), type };

        if (type & (DATATYPES.ARRAY - 1) == DATATYPES.ARRAY) return { data:this.getArray(type & (DATATYPES.ARRAY - 1)), type };
    }
}