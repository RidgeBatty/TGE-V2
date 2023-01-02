/**
 * Simple waypoints class which helps with creating animation/AI paths
 */


class Waypoints {
    constructor(o) {
        this.points = ('points' in o && Array.isArray(o.points)) ? o.points : [];        
        this._index = ('index' in o) ? o.index : 0;        
        this._eof   = false;
        this._bof   = false;
        this.rangeCheck();
    }

    rangeCheck() {
        this._eof = false;
        this._bof = false;
        
        if (this._index >= this.points.length) {
            this._index = this.points.length - 1;
            this._eof   = true;
        } 
        
        if (this._index < 0) {
            this._index = 0;
            this._bof   = true;
        }
    }

    get index() {
        return this._index;
    }

    set index(v) {
        this._index = v;
        this.rangeCheck();
    }

    get eof() {
        return this._eof;
    }

    get bof() {
        return this._bof;
    }

    get point() {        
        if (this.bof && this.eof) return null;
        return this.points[this._index]; 
    }

    set point(v) {
        this.rangeCheck();
        if (this.bof && this.eof) return null;
        this.points[this._index] = v;        
    }

    next() {
        this.index++;
        return this.point;
    }

    prev() {
        this.index--;
        return this.point;
    }
}

export { Waypoints }