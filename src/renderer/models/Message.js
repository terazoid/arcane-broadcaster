import Document from '../camo/lib/document';
import sha1 from 'node-sha1';
import dateFormat from 'dateformat';
import Vue from 'vue';

export default class Message extends Document {
  static create(data) {
    const m = super.create(data);
    m._id=sha1(m.getUniqueData());
    return m;
  }
  
  constructor() {
    super();

    this.date = {
      type: Number,
      default() {
        return Date.now()/1000|0;
      },
    };
    this.message = {
      type: String,
      validate(message) {
        if (Buffer.byteLength(message, 'utf8') > 65536) {
          return 'Message is too long';
        }
        if (message.trim().length < 1) {
          return 'Message is empty';
        }
      }
    };
    this.parent = {
      type: String,
      required: false,
    };
    this.pending = {
      type: Boolean,
      default: true,
    };
  }

  toString() {
    const {
      date,
      message,
      parent
    } = this;
    return JSON.stringify({
      //userId: this.userId,
      date,
      message,
      parent,
      //sign: this.sign,
    });
  }

  getUniqueData() {
    return `${this.message}:${this.date}:${this.parent}`;
  }

  get id() {
    return this._id;
    //return sha1(this.getUniqueData());
  }

  get formattedDate() {
    return dateFormat(new Date(this.date * 1000), 'yyyy-mm-dd');
  }

  get formattedTime() {
    return dateFormat(new Date(this.date * 1000), 'HH:MM:ss');
  }

  get shortId() {
    return Buffer.from(this.id, 'hex').toString('base64');
  }

  static fromString(json) {
    const {
      date,
      message,
      parent
    } = JSON.parse(json);

    const result = Message.create({
      date,
      message,
      parent
    });
    result.validate();
    return result;
  }

  static collectionName() {
    return 'messages';
  }
  
  postSave() {
    Vue.eventBus.$emit('messageSaved', this);
  }
  
  postDelete() {
    Vue.eventBus.$emit('messageDeleted', this);
  }
}