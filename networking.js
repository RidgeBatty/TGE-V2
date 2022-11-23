class Networking {
    constructor(host, errorHandler) {
        this.host                  = host || location.origin;
        this.errorHandler          = errorHandler ? errorHandler : _ => { throw 'Networking error!' };
        this.options               = null;
        this.autoDetectContentType = true;
    }
    
    async req(value = '') {        
        return new Promise((resolve, reject) => {
            let isJson = false;
            fetch(this.host + value, this.options)
                .then(r => { if (r.ok) return r; else { console.log(r); throw 'Networking error'; } })
                .then(r => { 
                    if (this.autoDetectContentType) {
                        const h    = [...r.headers]; 
                        const type = h.find(e => e[0] == 'content-type');
                        if (type == null) throw 'Content header not found';                        
                        if (type[1].includes('json')) { isJson = true; return r.json(); }
                        if (type[1].includes('text')) return r.text(); 
                        if (type[1].includes('octet-stream')) return r.blob(); 
                    } else {
                        isJson = true;
                        return r.json(); 
                    }
                })
                .then(j => { 
                    if (isJson && ('error' in j || !('result' in j))) return reject(j.error); 
                    if (isJson) return resolve(j.result);                                           // response is in JSON format
                    return resolve(j);                                                              // when response is anything else than JSON
                })
                .catch(e => { console.log(e); reject({ error:'Networking error'}) });
        }).catch(e => this.errorHandler(e)); 
    }
}

export { Networking }
