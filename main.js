import readline from 'readline';
import { readFile } from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import http from 'http';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})
const question = (query) => {
    return new Promise((resolve, reject) => {
        rl.question(query, resolve);
    })
}

const readFileOptions = { encoding: "utf-8" }

const host = 'localhost';
const port = 3000;

const getFiles = async () => {
    const pagePath = await question('Enter path to the template file: ');
    if(path.extname(pagePath).toLowerCase() !== '.html')
        throw new Error('Template file must be .html');
    const page = await readFile(pagePath, readFileOptions);

    const dataPath = await question('Enter path to the data file: ');
    let data;

    const dataPathExtension = path.extname(dataPath).toLowerCase();
    if(dataPathExtension === '.json') {
        const json = await readFile(dataPath, readFileOptions);
        data = JSON.parse(json);
    } else if(dataPathExtension === '.yaml') {
        const yaml = await readFile(dataPath, readFileOptions);
        data = YAML.parse(yaml);
    } else {
        throw new Error('Data file must be .json or .yaml');
    }

    return [ page, data ];
}

const modifyPage = (page, data) => {
    let open = 0, close = 0;
    for(let i = 0; i < page.length; i++) {
        open = page.indexOf('{{', i);
        close = page.indexOf('}}', open);
        
        if(open >= i && close >= open) {
            const key = page.slice(open + 2, close).trim();
            const value = data[key];
            if(!value)
                throw new Error(`No '${key}' in the data file`);

            page = page.slice(0, open) + value + page.slice(close + 2);

            i = open;
        }
    }

    return page;
}

const dynamicTemplateHandler = async () => {
    try {    
        const [ page, data ] = await getFiles();
        
        const modifiedPage = modifyPage(page, data);
        
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(modifiedPage);
            res.end();
        });
        
        server.listen(port, host, () => {
            console.log(`Access the page at http://${host}:${port}`);
        })
    } catch (error) {
        let msg = '';
        if(error.code === 'ENOENT')
            msg = 'Invalid path';
        else 
            msg = error.message;

        console.log(`ERROR: ${msg}`);
    }
}

dynamicTemplateHandler()
    .then(() => rl.close());