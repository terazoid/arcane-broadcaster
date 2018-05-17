import fs from 'fs';
import Path from "path";
import NodeRSA from "node-rsa";
import _ from 'lodash';
import Database from 'better-sqlite3';
import Message from "./Message";

const THREADS_PER_PAGE=20;

function getMessageObject(data) {
 return new Message(data.date, data.message, data.parent);
}

class App {
    constructor() {
        this.db=null;
    }

    getFullPath(path) {
        return Path.join(__dirname, path);
    }

    getConfig() {
        return JSON.parse(fs.readFileSync(this.getFullPath('./config.json')));
    }

    setConfig(value) {
        fs.writeFileSync(this.getFullPath('./config.json'), _.assign(this.getConfig(), value));
    }

    getKeys() {
        const {keys} = this.getConfig();
        let result = new NodeRSA();
        result.importKey(keys.priv, 'pkcs8-private-pem');
        result.importKey(keys.pub, 'pkcs8-public-pem');
        return result;
    }

    init() {
        if(!fs.existsSync(this.getFullPath('./config.json'))) {
            let defaultConfig = {};
            const key = new NodeRSA({b:2048});
            defaultConfig.keys = {
                priv: key.exportKey('pkcs8-private-pem'),
                pub: key.exportKey('pkcs8-public-pem'),
            };
            fs.writeFileSync(this.getFullPath('./config.json'), JSON.stringify(defaultConfig));
        }

        const dbFilePath = this.getFullPath('app.db');
        const dbExisted = fs.existsSync(dbFilePath);
        this.db=new Database(dbFilePath, {});

        if(!dbExisted) {
            //idUser CHAR(400),
            this.db.exec('CREATE TABLE messages (id CHAR(40) PRIMARY KEY, date INT NOT NULL, message VARCHAR(65536) NOT NULL, parent CHAR(40) NULL)');
            this.db.exec("INSERT INTO messages VALUES('idtest', "+(Date.now()/1000|0)+", 'me\nssage', null)");
            this.db.exec("INSERT INTO messages VALUES('idtest2', "+(Date.now()/1000)+", 'mes\nsage', null)");
        }
    }

    close() {
        this.db.close();
    }

    getThreadsPage(page) {
        return this.db.prepare('select * from messages where parent is null order by date desc limit :from, :count').all({
            from: THREADS_PER_PAGE*(page-1),
            count: THREADS_PER_PAGE,
        }).map(getMessageObject);
    }

    getThread(id) {

        const message = getMessageObject(this.db.prepare('select * from messages where parent is null and id=:id limit 1').one({id}));

        const replies = this.db.prepare('select * from messages where parent = :parent order by date desc').all({
            parent: id,
        }).map(getMessageObject);

        return {
            message,
            replies,
        };
    }
}


export default new App();