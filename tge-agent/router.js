import fs from 'fs';

const route = {
    list: [],
    get: function (endpoint, handler) { 
        const params = endpoint.split('/:');
        if (params.length > 0) {            
            endpoint = params[0];
            params.shift();            
        }
        const data = { method:'get', endpoint, params, handler };
        this.list.push(data);
    },
    post: function (endpoint, handler) {         
        const data = { method:'post', endpoint, params:[], handler };
        this.list.push(data);
    }
}

const parseBody = (req) => {    
    return new Promise((resolve, reject) => {
        let body = ''
        req.on('data', (data) => { body += data; });
        req.on('end', () => { 
            const ct = req.headers['content-type'];
            if (ct == 'application/json') {
                let result = null;
                try {
                    result = JSON.parse(body);
                } catch (e) {
                    return reject(null);
                }
                resolve(result);
            } else reject(null);
        });
    });
}

const requestListener = async(req, res) => {   
    console.log(req.method, req.url);

    if (req.method == 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, X-Requested-With');
        res.writeHead(200); 
        return res.end();
    }

    res.send = (o, code = 200, type = 'application/json') => { 
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', type);
        res.writeHead(code); 
        res.end(JSON.stringify(o));
    }
    res.sendFile = (filename) => { 
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.writeHead(200); 
        const file = fs.readFileSync(filename);
        res.write(file);
        res.end();
    }
    
    const r = route.list.find(e => req.url.startsWith(e.endpoint) && (e.params.length == req.url.substring(e.endpoint.length).split('/').length - 1));

    if (r) {
        const sp = req.url.substring(r.endpoint.length + 1).split('/');
        req.params = {};
        for (let i = 0; i < r.params.length; i++) req.params[r.params[i]] = sp[i];        
        if (r.method == 'post') {
            const body = await parseBody(req);
            return r.handler(req, res, body);
        }
        return r.handler(req, res);    
    }
    res.send({ error:'Resource not found' }, 404);        
}

const parseURL = (req) => {
 //   const ep
}

export { route, requestListener }