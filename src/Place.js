import _ from 'lodash';
import app from './App';
import {isHttpUri, isHttpsUri} from 'valid-url';

export default class Place {

    constructor({id=null, url, enabled=true}) {
        this._isNew = true;
        this.isValidated = false;
        this.errors = [];
        this.id = id;
        this.url = url;
        this.enabled = enabled;
    }

    validate() {
        this.errors = [];
        const {
            url, enabled
        } = this;
        if(!this._isNew && _.isInteger(this.id)) {
            this.errors.push({field: 'id', message: 'invalid value', value: id});
        }
        if (!_.isString(url)) {
            this.errors.push({field: 'url', message: 'invalid value', value: url});
        }
        else {
            if(Buffer.byteLength(url, 'utf8')>2083) {
                this.errors.push({field: 'url', message: 'Url is too long'});
            }
            if(!isHttpUri(url) && !isHttpsUri(url)) {
                this.errors.push({field: 'url', message: 'Invalid url'});
            }
        }
        if(!_.isBoolean(enabled)) {
            this.errors.push({field: 'enabled', message: 'invalid value', value: enabled});
        }
        if(this.errors.length===0 && this._isNew===true) {
            if(!_.isUndefined(app.db.prepare("select url from places where url=:url limit 1").get({url:this.url}))) {
                this.errors.push({field: 'url', message: 'Place already exists'});
            }
        }
        this.isValidated = true;
        return this.errors.length===0;
    }

    static fromSelect(row) {
        const {id, url} = row;
        const enabled = row.enabled !== 0;
        const result = new Place({id, url, enabled});
        result._isNew = false;
        return result;
    }

    static findAll() {
        return app.db.prepare("SELECT * FROM places").all().map(Place.fromSelect);
    }

    static delete(id) {
        return app.db.prepare("DELETE FROM places WHERE id=:id").run({id});
    }

    save(validate = false) {
        if(validate && !this.validate()) {
            throw new Error('Place validation errors: '+JSON.stringify(this.errors));
        }
        const {id, url} = this;
        const enabled = this.enabled?1:0;
        if(this._isNew) {
            app.db.prepare("INSERT INTO places(url, enabled) VALUES(:url, :enabled)").run({
                url, enabled
            });
        }
        else {
            app.db.prepare("UPDATE places SET url=:url, enabled=:enabled WHERE id=:id").run({
                id, url, enabled
            });
        }
    }

    static findEnabled() {
        return app.db.prepare("SELECT * FROM places WHERE enabled != 0").all().map(Place.fromSelect);
    }

    static findByUrl(url) {
        const row = app.db.prepare("SELECT * FROM places WHERE url=:url").get({url});
        return row?Place.fromSelect(row):row;
    }
}
