import _ from 'lodash';
import sha1 from 'sha1';
import app from './App';
import dateFormat from 'dateformat';

export default class Message {

    constructor({date, message, parent, pending=false}) {
        this._isNew = true;
        this.isValidated = false;
        this.errors = [];
        //this.userId = userId;
        this.date = date;
        this.message = message;
        this.parent = parent;
        this.pending = pending;
        //this.sign = sign;
    }

    toString() {
      const {date, message, parent} = this;
        return JSON.stringify({
            //userId: this.userId,
            date,
            message,
            parent,
            //sign: this.sign,
        });
    }

    getUniqueData() {
        return JSON.stringify(this.date)+':'+JSON.stringify(this.message)+':'+JSON.stringify(this.parent);
    }

    getId() {
        return sha1(this.getUniqueData());
    }

    getFormattedDate() {
        return dateFormat(new Date(this.date*1000), 'yyyy-mm-dd');
    }

    getFormattedTime() {
        return dateFormat(new Date(this.date*1000), 'HH:MM:ss');
    }

    getIdShort() {
        return Buffer.from(this.getId(), 'hex').toString('base64');
    }

    validate() {
        this.errors = [];
        const {
            date, message, parent, pending
        } = this;
        if (!_.isInteger(date)) {
            this.errors.push({field: 'date', message: 'invalid value', value: date});
        }
        if (!_.isString(message)) {
            this.errors.push({field: 'message', message: 'invalid value', value: message});
        }
        else {
            if(Buffer.byteLength(message, 'utf8')>65536) {
                this.errors.push({field: 'message', message: 'Message is too long'});
            }
        }
        if (!(parent === null || _.isString(parent))) {
            this.errors.push({field: 'parent', message: 'invalid value', value: parent});
        }
        if(!_.isBoolean(pending)) {
            this.errors.push({field: 'pending', message: 'invalid value', value: pending});
        }
        if(this.errors.length===0 && pending===true) {
            if(!_.isUndefined(app.db.prepare("select id from messages where id=:id limit 1").get({id:this.getId()}))) {
                this.errors.push({field: '*', message: 'Message already exists'});
            }
        }
        this.isValidated = true;
        return this.errors.length===0;
    }

    static fromString(json) {
        const {
            date, message, parent
        } = JSON.parse(json);

        const result = new Message({date, message, parent});
        if(!result.validate()) {
            throw new Error('invalid message object');
        }
        return result;
    }

    static fromSelect(row) {
        const {date, message, parent} = row;
        const pending = row.pending !== 0;
        const result = new Message({date, message, parent, pending});
        result._isNew = false;
        return result;
    }

    save() {
        if(!this.validate()) {
            throw new Error('Message validation errors: '+JSON.stringify(this.errors));
        }
        if(this._isNew) {
            const id=this.getId();
            const {date, message, parent} = this;
            const pending = this.pending?1:0;
            app.db.prepare("INSERT INTO messages VALUES(:id, :date, :message, :parent, :pending)").run({
                id, date, message, parent, pending
            });
        }
        else {
            throw new Error('Message editing is not supported');
        }
    }

    static findPending() {
        return app.db.prepare('select * from messages where pending!=0 order by date desc').all({}).map(Message.fromSelect);
    }
}
