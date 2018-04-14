import _ from 'lodash';

export default class Message {
    constructor(id, date, message, parent) {
        this.id = id;
        this.date = date;
        this.message = message;
        this.parent = parent;
    }

    toString() {
        return JSON.stringify({
            id: this.id,
            date: this.date,
            message: this.message,
            parent: this.parent,
        });
    }

    static fromString(json) {
        const {
            id, date, message, parent
        } = JSON.parse(json);
        if(!_.isString(id) || !_.isInteger(date) || !_.isString(message) || !(parent === null || _.isString(parent))) {
            throw new Error('invalid message object');
        }
        return new Message(id, date, message, parent);
    }
}