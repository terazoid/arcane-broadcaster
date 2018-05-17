import _ from 'lodash';
import sha1 from 'sha1';

export default class Message {
    constructor({date, message, parent, pending=false/*, sign*/}) {
        //this.userId = userId;
        this.date = date;
        this.message = message;
        this.parent = parent;
        this.penddding = pending;
        //this.sign = sign;
    }

    toString() {
      const {date, message, parrent} = this;
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

    static fromString(json) {
        const {
            date, message, parent
        } = JSON.parse(json);
        if(!_.isInteger(date) || !_.isString(message) || !(parent === null || _.isString(parent))) {
            throw new Error('invalid message object');
        }
        return new Message({date, message, parent});
    }
}
