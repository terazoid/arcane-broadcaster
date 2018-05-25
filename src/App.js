import fs from 'fs';
import Path from "path";
// import NodeRSA from "node-rsa";
import _ from 'lodash';
import Database from 'better-sqlite3';
import Message from "./Message";
import queue from 'async/queue';
import axios from 'axios';
import ImageContainer from "./ImageContainer";
import Place from "./Place";
import cheerio from 'cheerio';
import url from 'url';

const THREADS_PER_PAGE=20;

class App {
    constructor() {
        this.db=null;
        this.imagesQueue = queue(async (task, callback) => {
            try {
                const response = await axios({url: task.url, method: 'GET', responseType: 'arraybuffer'});
                if(response.status === 200 &&_.get(response.headers, 'content-type', 'image/png').toLowerCase() === 'image/png') {
                    const container = await ImageContainer.fromBuffer(response.data);
                    for(let i=0; i<4096; i++) {
                        let block;
                        try {
                            block = container.readBlock();
                        }
                        catch (e) {
                            break;
                        }
                        if(block instanceof Message) {
                            const old = Message.findById(block.getId());
                            if(typeof old === 'undefined') {
                                block.save();
                            }
                            else {
                                old.date = block.date;
                                old.message = block.message;
                                old.parent = block.parent;
                                old.pending = false;
                                old.save();
                            }
                        }
                        else if(block instanceof Place) {
                            if(typeof Place.findByUrl(block.url) === 'undefined') {
                                block.save();
                            }
                        }
                    }
                }
            }
            catch(e) {
                console.log(e);
            }
            callback();
        });
        this.placesQueue = queue(async (task, callback) => {
            try{
                const page = await axios.get(task.url);
                if(page.status===200) {
                    const $ = cheerio.load(page.data);
                    let links = [];
                    $('a[href]>img').each((i, el)=>{
                        links.push($(el).parent('a').attr('href'));
                    });
                    $('img').each((i, el)=>{
                        links.push($(el).attr('src'));
                    });
                    links = _.uniq(links.map((link)=>url.resolve(task.url, link)));
                    console.log(links);
                    this.imagesQueue.push(links.map((url)=>({url})));
                }
            }
            catch(e) {
                console.log(e);
            }
            callback();
        }, 5);

// assign a callback
        this.placesQueue.drain = function() {
        };
    }

    static getFullPath(path) {
        return Path.join(__dirname, '..', path);
    }

    // getConfig() {
    //     return JSON.parse(fs.readFileSync(this.getFullPath('./config.json')));
    // }

    // setConfig(value) {
    //     fs.writeFileSync(this.getFullPath('./config.json'), _.assign(this.getConfig(), value));
    // }
    //
    // getKeys() {
    //     const {keys} = this.getConfig();
    //     let result = new NodeRSA();
    //     result.importKey(keys.priv, 'pkcs8-private-pem');
    //     result.importKey(keys.pub, 'pkcs8-public-pem');
    //     return result;
    // }

    init() {
        // if(!fs.existsSync(this.getFullPath('./config.json'))) {
        //     let defaultConfig = {};
        //     const key = new NodeRSA({b:2048});
        //     defaultConfig.keys = {
        //         priv: key.exportKey('pkcs8-private-pem'),
        //         pub: key.exportKey('pkcs8-public-pem'),
        //     };
        //     fs.writeFileSync(this.getFullPath('./config.json'), JSON.stringify(defaultConfig));
        // }

        const dbFilePath = App.getFullPath('app.db');
        const dbExisted = fs.existsSync(dbFilePath);
        this.db=new Database(dbFilePath, {});

        if(!dbExisted) {
            //idUser CHAR(400),
            this.db.exec('CREATE TABLE messages (id CHAR(40) PRIMARY KEY, date INT NOT NULL, message VARCHAR(65536) NOT NULL, parent CHAR(40) NULL, pending INTEGER NOT NULL DEFAULT 0)');
            for(let i=0; i<5; i++) {
                const thread = new Message({date:Date.now()/1000|0,message:Math.random().toString(36)+Math.random().toString(36),parent:null});
                thread.save();
                for(let j=Math.random()*20; j>=0; j--) {
                    const reply = new Message({date:Date.now()/1000|0,message:Math.random().toString(36)+Math.random().toString(36)+Math.random().toString(36),parent:thread.getId()});
                    reply.save();
                }
            }
            this.db.exec('CREATE TABLE places (id INTEGER PRIMARY KEY AUTOINCREMENT, url VARCHAR(2083) NOT NULL COLLATE NOCASE, enabled INTEGER NOT NULL DEFAULT 1, CONSTRAINT url_unique UNIQUE (url))');
        }
    }

    close() {
        this.db.close();
    }

    getThreadsPage(page) {
        return this.db.prepare('select * from messages where parent is null order by date desc limit :from, :count').all({
            from: THREADS_PER_PAGE*(page-1),
            count: THREADS_PER_PAGE,
        }).map(Message.fromSelect);
    }

    getThread(id) {
        const thread = Message.fromSelect(this.db.prepare('select * from messages where parent is null and id=:id limit 1').get({id}));
        const replies = this.db.prepare('select * from messages where parent = :parent order by date asc').all({
            parent: id,
        }).map(Message.fromSelect);

        return {
            thread,
            replies,
        };
    }
}


export default new App();
