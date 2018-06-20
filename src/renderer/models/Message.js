import Document from '../camo/lib/document'
import sha1 from 'node-sha1'
import dateFormat from 'dateformat'
import Vue from 'vue'
import Forum from '../models/Forum'
import NodeRSA from 'node-rsa'

export default class Message extends Document {
  static create(data) {
    const m = super.create(data);
    m.uniqueId=sha1(m.getUniqueData());
    return m;
  }
  
  constructor() {
    super();
    
    this.uniqueId = {
      type: String,
      required: true,
    };
    this.forumId = {
      type: String,
      required: true,
    };
    this.userId = {
      type: String,
      required: true,
    };
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
    this.sign = {
      type: String,
      required: true,
    };
  }
  
  get forum() {
    return Forum.findOne({_id: this.forumId});
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
    return `${this.forumId}:${this.message}:${this.date}:${this.parent}`;
  }

  get id() {
    return this.uniqueId;
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
  
  validateSign() {
    const key = new NodeRSA();
    try{
      key.importKey(Buffer.from(this.userId, 'base64'), 'pkcs1-public-der');
      return key.verify(this.uniqueId, Buffer.from(this.sign, 'base64'));
    }
    catch(e) {
      return false;
    }
    return false;
  }
  
  static async process({uniqueId, forumId, userId, date, message, parent, sign}) {
    let m = await Message.findOne({uniqueId});
    if(m === null) {
      const m = Message.create({forumId, userId, date, message, parent, sign, pending:false});
      if(m.uniqueId !== uniqueId) {
        console.log({message: 'Invalid uniqueId', m, uniqueId});
        return null;
      }
      if(!m.validateSign()) {
        console.log({message: 'Invalid signature', m});
        return null;
      }
      return await m.save();
    }
    else if (m.pending) {
      m.pending = false;
      return await m.save();
    }
    return null;
  }
  
  static async findPendingMessages(forumId) {
    return Message.find({forumId, pending: true}, {sort:'date'});
  }
  
  toString() {
    const {uniqueId: id, forumId, userId, date, message, parent, sign} = this;
    return JSON.stringify({id, forumId, userId, date, message, parent, sign});
  }
  
  postSave() {
    Vue.eventBus.$emit('messageSaved', this);
  }
  
  postDelete() {
    Vue.eventBus.$emit('messageDeleted', this);
  }
}