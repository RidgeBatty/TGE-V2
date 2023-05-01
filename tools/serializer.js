/**
 * Tools
 * 
 * Serialization of generic data
 * 
 */
import { DATATYPES } from "../deserializer.js";
import { downloadFile } from "../utils.js";

export class Serializer {
    constructor(o) {
        this.method = 'bin8';        
        this.output = '';
        this.data   = new Uint8Array(1);
        this.offset = 0;

        this.scrambleBytes = [33, 55, 22, 11, 7];
        
        this.reallocations = 0;                                                             // number of reallocations
        this.blockSize     = 0;                                                             // block size of last reallocation
        this.maxBlockSize  = 16384;                                                         // default stategy keeps doubling the buffer size until maxBlockSize is reached
    }

    download(filename) {
        downloadFile(filename, this.asTypedArray, 'octet/stream');
    }

    get asTypedArray() {
        return this.data.slice(0, this.offset);
    }

    encodeByte(b) {                
        this.data[this.offset] = b ^ this.scrambleBytes[this.offset % this.scrambleBytes.length];
        this.offset++;
        
        if (this.offset != this.data.length) return;

        // allocate more memory        
        this.blockSize  = this.data.length < this.maxBlockSize ? this.data.length * 2 : this.maxBlockSize; 
        const newBuffer = new Uint8Array(this.blockSize);
        newBuffer.set(this.data);
        this.data = newBuffer;            
        this.reallocations++;        
    }

    encodeByteArray(b) {        
        for (let i = 0; i < b.length; i++) this.encodeByte(b[i]);        
    }

    addStr(s, bitLength = 16) {            
        let len = 0;
        if (bitLength == 8)  { len = Math.min(s.length, 256 - 1); this.encodeByte(len); } else
        if (bitLength == 16) { len = Math.min(s.length, 256 ** 2 - 1); this.addUint16(len); } else  
            throw 'Unsupported string bitlength = ' + bitLength;
        /*        
        if (bitLength == 24) len = Math.min(s.length, 256 ** 3 - 1);
        if (bitLength == 32) len = Math.min(s.length, 256 ** 4 - 1);
        */
        
        const encodedStr = new TextEncoder("utf-8").encode(s.slice(0, len));    
        this.encodeByteArray(encodedStr);
    }

    addInt8(i) {
        if (i < -128 || i > 127) throw 'Value out of bounds';
        this.encodeByte(i);
    }

    addUint8(i) {                                                   
        if (i < 0 || i > 255) throw 'Value out of bounds';
        this.encodeByte(i);
    }

    addInt16(i) {
        if (i < -(256 ** 2 / 2) || i > (256 ** 2 / 2 - 1)) throw 'Value out of bounds';
        this.encodeByte(i >> 8);
        this.encodeByte(i & 0xFF);
    }

    addUint16(i) {
        if (i < 0 || i > (256 ** 2 - 1)) throw 'Value out of bounds';
        this.encodeByte(i >> 8);
        this.encodeByte(i & 0xFF);
    }

    addInt32(i) {
        if (i < -(256 ** 4 / 2) || i > (256 ** 4 / 2 - 1)) throw 'Value out of bounds';
        const v   = new ArrayBuffer(4);        
        const buf = new DataView(v);
        buf.setInt32(0, i);
        for (let n = 0; n < 4; n++) this.encodeByte(buf.getUint8(n));
    }

    addUint32(i) {
        if (i < 0 || i > (256 ** 4 - 1)) throw 'Value out of bounds';        
        const v   = new ArrayBuffer(4);        
        const buf = new DataView(v);
        buf.setUint32(0, i);
        for (let n = 0; n < 4; n++) this.encodeByte(buf.getUint8(n));
    }

    addFloat32(i) {
        const val = new ArrayBuffer(4);        
        const buf = new DataView(val);
        buf.setFloat32(0, i);
        for (let n = 0; n < 4; n++) this.encodeByte(buf.getUint8(n));
    }

    addVector2(v) {
        this.addFloat32(v.x);
        this.addFloat32(v.y);
    }

    addArray(v, arrayType) {     
        this.addUint32(v.length);
        if (arrayType == DATATYPES.INT8)    for (let i = 0; i < v.length; i++) this.encodeByte(v[i]); else
        if (arrayType == DATATYPES.INT16)   for (let i = 0; i < v.length; i++) this.addInt16(v[i]); else
        if (arrayType == DATATYPES.INT32)   for (let i = 0; i < v.length; i++) this.addInt32(v[i]); else  
        if (arrayType == DATATYPES.FLOAT32) for (let i = 0; i < v.length; i++) this.addFloat32(v[i]); else  
            throw 'Unsupported Array type: ' + arrayType;
    }

    addValue(type, value) {
        this.encodeByte(type);
        if (type == DATATYPES.INT8)    return this.addInt8(value);
        if (type == DATATYPES.UINT8)   return this.addUInt8(value);
        if (type == DATATYPES.INT16)   return this.addInt16(value);
        if (type == DATATYPES.UINT16)  return this.addUInt16(value);
        if (type == DATATYPES.INT32)   return this.addInt32(value);        
        if (type == DATATYPES.UINT32)  return this.addUint32(value);
        if (type == DATATYPES.FLOAT32) return this.addFloat32(value);
        if (type == DATATYPES.VECTOR2) return this.addVector2(value);
        if (type == DATATYPES.STR8)    return this.addStr(value, 8);
        if (type == DATATYPES.STR16)   return this.addStr(value, 16);

        if (type & DATATYPES.ARRAY == DATATYPES.ARRAY) return this.addArray(value, type & (DATATYPES.ARRAY - 1));
    }
}