import { Engine } from "../engine.js";

/*

    TGE Tools/FileSystem class is a generic interface for disk access. Because of the sandboxing, JavaScript has limited access to files.
    TGE attempts to solve the issue by providing a few different implementations. Most robust is FileSystemAgent which relies on server side module called TGE-Agent.
    TGE-Agent has unrestricted hard disk access which it simply exposes to browser side JavaScript via regular HTTP requests.

*/
class FileSystemAgent {
    constructor(net, errorHandler) {
        if (net == null && Engine.net == null) throw 'Networking not available.'
        this.net        = net || Engine.net;    
        this.onError    = errorHandler ? errorHandler : function() {};    
        this._cachedCwd = '';
    }

    _request() {
        return this.net.req(...arguments).catch(e => this.onError(e, { ...arguments }));        
    }
    /**
     * List directory contents with optional filter (file extension[s]) 
     * @param {string?} filter [Optional] pipe separated list of extensions: "png|jpg|gif"
     * @returns 
     */
    async listDir(filter) { 
        if (filter) return await this._request('/dir/' + filter);
        return await this._request('/dir');
    }
    async getWorkingDirectory() { const cwd = await this._request('/cwd'); this._cachedCwd = cwd; return cwd; }    
    async getFileInfo(name) { return await this._request('/info/' + name) }
    async changeDirectory(dir) { const d = await this._request('/cd', dir); this._cachedCwd = d.currentDir; return d; }
    async loadFile(name) { return await this._request('/dl/' + name) }
    async saveFile(data) { return this._request('/save', data) }    
}

const FS = (net, errorHandler) => {
    return new FileSystemAgent(net ? net : Engine.net, errorHandler);    
}

export { FileSystemAgent, FS }
