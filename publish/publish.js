/*

    TGE Game Publisher Service
    - Copies all files to the target folder, overwriting everything
    - Compresses all .js files

*/
import { execSync } from 'child_process';
import fs, { readFileSync } from 'fs';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Hjson = require('hjson');

/**
 * Gets all files from a directory (recursively), optionally including files by given file extension (filterByExt)
 * @param {string} dirPath 
 * @param {array} arr 
 * @param {string} filterByExt 
 * @returns 
 */
const getAllFiles = (dirPath, arr = [], filterByExt = '') => {
    const files = fs.readdirSync(dirPath);        
    files.forEach(file => {
        const p = `${dirPath}/${file}`;
        if (fs.statSync(p).isDirectory()) arr = getAllFiles(p, arr);
            else {
                if (filterByExt != '') {
                    if (p.split('.').pop() == filterByExt) arr.push(p);
                } else arr.push(p);
            }
    });
    return arr;
}

const processFiles = (files, settings) => {    
    let copiedBytes = 0, copiedCount = 0;
    let log = [];

    for (const srcFile of files) {
        const trgFile    = srcFile.replace(settings.source, settings.target.path);        
        const srcStats   = fs.statSync(srcFile);

        const trgExists  = fs.existsSync(trgFile);
        const trgStats   = trgExists ? fs.statSync(trgFile) : { mtime:-1 };
        const modified   = +srcStats.mtime != +trgStats.mtime;    
        const targetPath = trgFile.split('/');
        targetPath.pop();
            
        if (modified) {
            const path = targetPath.join('/');                       
            if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive:true });            
            fs.copyFileSync(srcFile, trgFile);

            log.push('[COPIED] ' + srcFile + '-->' + trgFile + ' ' + srcStats.size + ' bytes.');        
            
            copiedBytes += srcStats.size;
            copiedCount++;
        } else {
            log.push('[SKIPPED] ' + srcFile + ' ' + srcStats.size + ' bytes.');        
        }
        /*
        const o = execSync('uglifyjs ' + source, (err, stdout, stderr) => {
            console.log(err);        
        });
        */               
    }    
    console.log('Copied', copiedCount,'files, total of', copiedBytes, 'bytes.');
    if (settings.options.logFile) fs.writeFileSync('./publish-log.txt', log.join('\r\n'));
}

const main = () => {
    const settings = Hjson.parse(readFileSync('./settings.hjson', { encoding:'utf-8' }))
    const ignored  = readFileSync('./publish-ignore.txt', { encoding:'utf-8' }).split('\r\n');

    let files = getAllFiles(settings.source); 
    let total = files.length;       
    files = files.filter(f => { if (ignored.filter(i => f.includes(i)).length == 0) return true });

    console.log();
    console.log('Total files:', total);
    console.log('Ignored files:', files.length);

    processFiles(files, settings);

    console.log('Done.');    
    process.exit(0);
}

main();

