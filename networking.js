class Networking {
    constructor(host, errorHandler) {
        this.host                  = host || location.origin;
        this.errorHandler          = errorHandler ? errorHandler : _ => { throw 'Networking error!' };
        this.options               = null;
        this.autoDetectContentType = true;
    }
    
    async req(value = '', payload) {        
        return new Promise((resolve, reject) => {
            let isJson  = false;
            let options = this.options;

            if (payload) {                                                                          // post request
                options = {
                    method : 'POST',                    
                    body: JSON.stringify(payload),                    
                    headers: {
                        'Content-Type' : 'application/json'
                    }
                }             
            }

            fetch(this.host + value, options)
                .then(r => { if (r.ok) return r; else { console.log(r); throw 'Networking error'; } })
                .then(r => { 
                    if (this.autoDetectContentType) {
                        const h    = [...r.headers]; 
                        const type = h.find(e => e[0].toLowerCase() == 'content-type');
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
                    if (isJson && ('error' in j || !('result' in j))) { 
                        console.warn('JSON response must contain "result" field'); 
                        return reject({ error:j.error }); 
                    }
                    if (isJson) return resolve(j.result);                                           // response is in JSON format
                    return resolve(j);                                                              // when response is anything else than JSON
                })
                .catch(e => { reject({ error:'Networking error', e }) });
        }).catch(e => { reject({ error:'Networking error', e }) }); 
    }
}

export { Networking }
