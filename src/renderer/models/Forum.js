import Vue from 'vue'
import Document from '../camo/lib/document'
import sha1 from 'node-sha1'
import NodeRSA from 'node-rsa'
import aesjs from 'aes-js'
import crypto from 'crypto'

const validateName = (name) => {
  if (Buffer.byteLength(name, 'utf8') > 128) {
    return 'Name is too long';
  }
  if (name.trim().length < 1) {
    return 'Name is empty';
  }
}

export default class Forum extends Document {
  constructor() {
    super();

    this.title = {
      type: String,
      default: '',
      validate: validateName,
      required: true,
    };
    this.rsaKey = {
      type: String,
      required: true,
    };
    this.aesKey = {
      type: String,
      required: false,
      default: null,
    };
    this._rsaKey = null;
  }
  
  get isKeySet() {
    return this.aesKey!==null;
  }
  
  get aesCipher() {
    const key = Buffer.from(this.aesKey, 'base64');
    const aesCtr = new aesjs.ModeOfOperation.ctr(key);
    return aesCtr;
  }

  static collectionName() {
    return 'forums';
  }
  
  get rsaKeyObject() {
    return this._rsaKey;
  }
  
  postFound() {
    this._rsaKey = new NodeRSA();
    this._rsaKey.importKey(this.rsaKey);
  }
  
  get isAdmin() {
    return this.rsaKeyObject.isPrivate()!==false;
  }
  
  async setRandomKeys() {
    const rsaKey = new NodeRSA({b:2048});
    this.rsaKey = rsaKey.exportKey('pkcs1-private-pem');
    
    this.aesKey = await new Promise((resolve,reject)=>{
      crypto.randomBytes(16, (err, buf)=>{
        if(err) {
          reject(err);
        }
        else {
          resolve(buf.toString('base64'));
        }
      });
    });
  }
  
  postSave() {
    Vue.eventBus.$emit('forumSaved', this);
  }
  
  postDelete() {
    Vue.eventBus.$emit('forumDeleted', this);
  }
  
  static async findOrCreate({id, title, key}) {
    let isNew = false;
    let forum = await Forum.findOne({_id:id});
    if(forum === null) {
      forum = Forum.create({_id:id, title, rsaKey:key});
      isNew = true;
      await forum.save();
    }
    return { forum, isNew };
  }
}