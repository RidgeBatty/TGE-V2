import http from 'http';
import fs from 'fs';
import path from 'path';
import { filterFiles } from './utils.js';
import { route, requestListener } from './router.js';

let currentDir = process.cwd();
    
const createRoutes = () => {
    route.get('/cwd', async(req, res) => {        
        res.send({ result:currentDir.replaceAll('\\', '/') });    
    });

    route.get('/dir', async(req, res) => {
        let dir = await filterFiles(currentDir, null, true);
        dir = dir.sort((a, b) => { if (a.kind == 'directory' && b.kind != 'directory') return -1; else return a-b; });
        res.send({ result:dir });    
    });

    route.get('/dir/:filter', async(req, res) => {
        const filter = req.params.filter.split('%7C').map(e => '.' + e);              // pipe symbol is used as a separator
        console.log('Dir filters:', filter);        
        let dir = await filterFiles(currentDir, filter, true);
        dir = dir.sort((a, b) => { if (a.kind == 'directory' && b.kind != 'directory') return -1; else return a-b; });
        res.send({ result:dir });    
    });

    route.get('/info/:file', async(req, res) => {        
        const filename = path.join(currentDir, req.params.file);
        console.log('Get file information:', filename);
        res.send({ result:fs.statSync(filename) });    
    });

    route.get('/dl/:file', async(req, res) => {        
        console.log('Downloading from:', currentDir);
        res.sendFile(path.join(currentDir, req.params.file));    
    });

    route.post('/cd', (req, res, body) => {
        if (body.name) { 
            console.log(body);
            currentDir = path.resolve(currentDir, body.name);
            if (fs.existsSync(currentDir)) {
                console.log('Dir:', currentDir);
                console.log('File exists:', fs.existsSync());
                return res.send({ status:'ok', result:{ currentDir } });    
            }
        }
        console.log('Directory not found:', body.name);
        console.log('Resorting to default CWD');
        currentDir = process.cwd();
        res.send({ status:'ok', result:{ currentDir, info:'RESORT-CWD' }});    
    });

    route.post('/save', (req, res, body) => {        
        if (body.filename) {
            const filename = path.join(currentDir, body.filename);
            fs.writeFileSync(filename, body.data);
            const stat = fs.statSync(filename);
            return res.send({ status:'ok', result:{ info:'saved', size:stat.size }});
        }
        res.send({ status:'ok', result:'failed' });
    });
}

const main = () => {    
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));
    const { port, host } = settings;
    createRoutes();
    const server = http.createServer(requestListener);
    server.listen(port, host, () => {
        console.log(`HTTP server running at port ${port}`)
    });
}

const test = async() => {
    console.log(await filterFiles('./', null, true));
}
  
main();