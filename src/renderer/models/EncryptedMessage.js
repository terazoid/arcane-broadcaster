import Document from '../camo/lib/document'
import sha1 from 'node-sha1'
import dateFormat from 'dateformat'
import Vue from 'vue'
import Forum from '../models/Forum'

export default class EncryptedMessage extends Document {
  static create(data) {
    const m = super.create(data);
    m._id=sha1(m.getUniqueData());
    return m;
  }
  
  constructor() {
    super();

    this.forumId = {
      type: String,
      required: true,
    },
    this.data = {
      type: String,
      required: true,
    };
    this.cs = {
      type: Number,
      required: true,
    };
  }
  
  get forum() {
    return Forum.findOne({_id: this.forumId});
  }

  static collectionName() {
    return 'encrypted-messages';
  }
  
  static async process({forumId, data, cs}) {
    if(await EncryptedMessage.findOne({forumId,cs}) === null) {
      await EncryptedMessage.create({
        forumId: 1,
        data: blockData.toString('base64'),
        cs,
      }).save();
    }
  }
}