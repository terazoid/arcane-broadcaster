import CRC32 from 'crc-32'
import aesjs from 'aes-js'
import Forum from '../models/Forum'
import Message from '../models/Message'
import EncryptedMessage from '../models/EncryptedMessage'
import Place from '../models/Place'
import InviteRequest from '../models/InviteRequest'
import InviteResponse from '../models/InviteResponse'
import Identity from '../models/Identity'
import _ from 'lodash'
import crypto from 'crypto'

export default class TextContainer {
  static get MAX_LENGTH() { return 30000; }
  static get BLOCK_MESSAGE() { return 1; }
  static get BLOCK_PLACE() { return 2; }
  static get BLOCK_FORUM() { return 3; }
  static get BLOCK_INVITE_REQUEST() { return 4; }
  static get BLOCK_INVITE_RESPONSE() { return 5; }
  
  static get ZWSPACE() { return String.fromCharCode(0x200b); }
  
  constructor() {
    this._message = '';
    this._data = void 0;
    this._forum = void 0;
    this.excessBlocks = [];
  }
  
  set message(message) {
    this._message = message;
  }
  
  set forum(forum) {
    if(!(forum instanceof Forum)) {
      throw new Error('expected Forum instance');
    }
    this._forum = forum;
  }
  
  set data(data) {
    let output = [];
    this.excessBlocks = [];
    let size = 0;
    if(!this._forum) {
      throw new Error('you need to set forum first');
    }
    {
      const id = this._forum._id;
      const title=this._forum.title;
      const key = this._forum.rsaKeyObject.exportKey('pkcs1-public-pem');
      const json = JSON.stringify({id, title, key});
      const bJson = Buffer.from(json);
      const cs = CRC32.buf(bJson);
      const bHeader = Buffer.allocUnsafe(1+4+4);
      bHeader.writeUInt8(TextContainer.BLOCK_FORUM, 0, true);
      bHeader.writeUInt32BE(bJson.length, 1, true);
      bHeader.writeInt32BE(cs, 5, true);
      output.push(bHeader);
      output.push(bJson);
    }
    let aesCipher = null;
    for(let block of data) {
      if(block instanceof Message) {
        if(block.forumId !== this._forum._id) {
          console.warn('got message for different forum');
          continue;
        }
        if(!aesCipher) {
          aesCipher = this._forum.aesCipher;
        }
        const bJson = Buffer.from(block.toString());
        const cs = CRC32.buf(bJson);
        const bJsonEnc = Buffer.from(aesCipher.encrypt(bJson));
        const bHeader = Buffer.allocUnsafe(1+4+4);
        bHeader.writeUInt8(TextContainer.BLOCK_MESSAGE, 0, true);
        bHeader.writeUInt32BE(bJsonEnc.length, 1, true);
        bHeader.writeInt32BE(cs, 5, true);
        if(size+bHeader.length+bJson.length>TextContainer.MAX_LENGTH) {
          this.excessBlocks.push(block);
        }
        else {
          output.push(bHeader);
          output.push(bJsonEnc);
          size += bHeader.length+bJson.length;
        }
      }
      if(block instanceof InviteRequest) {
        const aesKey = crypto.randomBytes(16);
        const aesCtr = new aesjs.ModeOfOperation.ctr(aesKey);
        const aesKeyEnc = this._forum.rsaKeyObject.encrypt(aesKey);
        const json = JSON.stringify({
          message: block.message,
          userId: block.userId,
        });
        const bJson = Buffer.from(json);
        const bJsonEnc = Buffer.from(aesCtr.encrypt(bJson));
        const bHeader = Buffer.allocUnsafe(1+2+4);
        let offset = 0;
        offset = bHeader.writeUInt8(TextContainer.BLOCK_INVITE_REQUEST, offset, true);
        offset = bHeader.writeUInt16BE(aesKeyEnc.length, offset, true);
        offset = bHeader.writeUInt32BE(bJsonEnc.length, offset, true);
        output.push(bHeader);
        output.push(aesKeyEnc);
        output.push(bJsonEnc);
        size += bHeader.length+aesKeyEnc.length+bJsonEnc.length;
      }
      if(block instanceof InviteResponse) {
        if(block.forumId !== this._forum.id) {
          console.warn('got invite for different forum');
          continue;
        }
        const userId = Buffer.from(block.userId, 'base64');
        const sign = Buffer.from(block.sign);
        const aesKey = block.userKey.encrypt(Buffer.from(block.aesKey, 'base64'));
        const bHeader = Buffer.allocUnsafe(1+4+4+4);
        let offset = 0;
        offset = bHeader.writeUInt8(TextContainer.BLOCK_INVITE_RESPONSE, offset, true);
        offset = bHeader.writeUInt32BE(userId.length, offset, true);
        offset = bHeader.writeUInt32BE(sign.length, offset, true);
        offset = bHeader.writeUInt32BE(aesKey.length, offset, true);
        output.push(bHeader);
        output.push(userId);
        output.push(sign);
        output.push(aesKey);
        size += bHeader.length + userId.length + sign.length + aesKey.length;
      }
    }
    this._data = TextContainer.encode(Buffer.concat(output));
  }
  
  static async processData(input) {
    let data = [];
    const buf = TextContainer.decode(input);
    let pointer = 0;
    const ensureSpace = (bytes) => {
      if(buf.length<pointer+bytes) {
        throw new RangeError();
      }
    };
    const readInt = (length, unsigned) =>{
      ensureSpace(length);
      const result = (()=>{
        switch(length) {
          case 1:
          return unsigned?buf.readUInt8(pointer):buf.readInt8(pointer);
          case 2:
          return unsigned?buf.readUInt16BE(pointer):buf.readInt16BE(pointer);
          case 4:
          return unsigned?buf.readUInt32BE(pointer):buf.readInt32BE(pointer);
          default:
          throw new Error('Unknown int type');
        }
      })();
      pointer+=length;
      return result;
    }
    let forum = null;
    let isNew;
    let messages = [];
    let aesCipher;
    while(pointer<buf.length) {
      const type = readInt(1, true);
      let bLength = 0;
      switch(type) {
        case TextContainer.BLOCK_FORUM:
        {
          const length = bLength = readInt(4, true);
          const cs = readInt(4, false);
          const blockData = buf.slice(pointer,pointer+length);
          if(CRC32.buf(blockData) !== cs) {
            throw new Error('Invalid checksum');
          }
          const {id, title, key} = JSON.parse(blockData);
          const forumResult = await Forum.findOrCreate({id, title, key});
          forum = forumResult.forum;
          isNew = forumResult.isNew;
          aesCipher = forum.isKeySet?forum.aesCipher:void 0;
          break;
        }
        case TextContainer.BLOCK_MESSAGE:
        {
          const length = bLength = readInt(4, true);
          const cs = readInt(4, false);
          const blockData = buf.slice(pointer,pointer+length);
          if(!forum.isKeySet) {
            EncryptedMessage.process({
                forumId: forum._id,
                data: blockData.toString('base64'),
                cs,
              });
          }
          else {
            const messageJson = Buffer.from(aesCipher.decrypt(blockData));
            const realCs = CRC32.buf(messageJson);
            if(realCs !== cs) {
              throw new Error(JSON.stringify({message:'Invalid checksum', cs, realCs}));
            }
            const {id: uniqueId, userId, date, message, parent, sign} = JSON.parse(messageJson);
            messages.push(Message.process({uniqueId,forumId:forum._id, userId, date, message, parent, sign}));
          }
          break;
        }
        case TextContainer.BLOCK_INVITE_REQUEST:
        {
          const aesKeyEncLength = readInt(2, true);
          const blockLength = readInt(4, true);
          bLength = aesKeyEncLength+blockLength;
          if(!forum.isAdmin) {
            break;
          }
          const aesKeyEnc = buf.slice(pointer,pointer+aesKeyEncLength);
          const blockDataEnc = buf.slice(pointer+aesKeyEncLength,pointer+aesKeyEncLength+blockLength);
          
          const aesKey = forum.rsaKeyObject.decrypt(aesKeyEnc);
          const aesCtr = new aesjs.ModeOfOperation.ctr(aesKey);
          const blockData = Buffer.from(aesCtr.decrypt(blockDataEnc));
          console.log(blockData.toString('utf8'));
          const {message, userId} = JSON.parse(blockData);
          const r = InviteRequest.create({forumId: forum._id, message, userId});
          if(!(await r.isDuplicate())) {
            await r.save();
          }
          break;
        }
        case TextContainer.BLOCK_INVITE_RESPONSE:
        {
          const userIdLength = readInt(4, true);
          const signLength = readInt(4, true);
          const aesKeyLength = readInt(4, true);
          bLength = userIdLength+signLength+aesKeyLength;
          if(!forum.isAdmin && forum.isKeySet) {
            break;
          }
          bLength = null;
          const userId = buf.slice(pointer,pointer+userIdLength).toString('base64');
          pointer += userIdLength;
          const sign = buf.slice(pointer,pointer+signLength);
          pointer += signLength;
          const aesKeyEnc = buf.slice(pointer,pointer+aesKeyLength);
          pointer += aesKeyLength;
          console.log({userId,sign,aesKeyEnc});
          if(!InviteResponse.verify({userId}, sign, forum)) {
            throw new Error('Invalid InviteRequest signature');
          }
          const uid = Identity.instance();
          if(!forum.isKeySet && uid.stringId !== userId) {
            break;
          }
          if(!forum.isKeySet) {
            const aesKey = uid.key.decrypt(aesKeyEnc);
            forum.aesKey = aesKey.toString('base64');
            await forum.save();
            const encMessages = EncryptedMessage.find({forumId:forum._id});
            for(const message of messages) {
              try {
                aesCipher = forum.aesCipher;
                const messageJson = Buffer.from(aesCipher.decrypt(Buffer.from(message.data, 'base64')));
                const realCs = CRC32.buf(messageJson);
                if(realCs !== cs) {
                  throw new Error(JSON.stringify({message:'Invalid checksum', cs, realCs}));
                }
                const {id: uniqueId, userId, date, message, parent, sign} = JSON.parse(messageJson);
                messages.push(Message.process({uniqueId,forumId:forum._id, userId, date, message, parent, sign}));
                await m.delete();
              }
              catch(e){
                console.log(e);
              }
            }
          }
          if(forum.isAdmin) {
            const invReq = await InviteRequest.findOne({forumId: forum._id, userId});
            if(invReq !== null && invReq.status !== InviteRequest.STATUS_ACCEPTED) {
              invReq.status = InviteRequest.STATUS_ACCEPTED;
              await invReq.save();
            }
          }
          break;
        }
      }
      pointer+=bLength;
      if(pointer>buf.length) {
        throw new RangeError('Invalid offset in text container');
      }
    }
    messages = await Promise.all(messages);
    messages = _.filter(messages);
    return {forum, isNew, messages};
  }
  
  
  get outputMessage() {
    if(!this._data) {
      return this._message;
    }
    let output = [this._message];
    if(this._data) {
      const sp = TextContainer.ZWSPACE.repeat(this._message.length<2?2:1);
      output.push(`[FONT="${this._data}"]${sp}[/FONT]`);
    }
    return output.join('');
  }
  
  static encode(input) {
    if(!Buffer.isBuffer(input)) {
      throw new Error('Expected Buffer');
    }
    let result = new Array(input.byteLength);
    input.forEach((b, index) => {
      result[index] = String.fromCharCode(b + 248);
    });
    return result.join('');
  }

  static decode(input) {
    if(!_.isString(input)) {
      throw new Error('Expected string');
    }
    const result = Buffer.allocUnsafe(input.length);
    for(var i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i) - 248;
      if(code<0 || code>255) {
        throw new Error('Invalid character in encoded string');
      }
      result.writeUInt8(code, i, true);
    }
    return result;
  }
}