import fs from 'fs';
import Path from "path";
import NodeRSA from "node-rsa";
import _ from 'lodash';

class App {
    static i;
    static instance() {
        if(!App.i) {
            App.i=new App();
        }
        return App.i;
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
        if(!fs.existsSync(this.getFullPath('./settings.json'))) {
            let defaultConfig = {};
            const key = new NodeRSA({b:512});
            defaultConfig.keys = {
                priv: key.exportKey('pkcs8-private-pem'),
                pub: key.exportKey('pkcs8-public-pem'),
            };
            fs.writeFileSync(this.getFullPath('./config.json'), defaultConfig);
        }
    }
}