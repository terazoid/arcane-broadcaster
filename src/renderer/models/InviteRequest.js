import Document from '../camo/lib/document'
import Vue from 'vue';
import _ from 'lodash'
import NodeRSA from 'node-rsa'
import sha1 from 'node-sha1'

export default class InviteRequest extends Document {
  static get STATUS_NEW() {return 1;}
  static get STATUS_ACCEPTED() {return 2;}
  static get STATUS_DECLINED() {return 3;}
  
  constructor() {
    super();

    this.forumId = {
      type: String,
    };
    this.message = {
      type: String,
      validate(v) {
        if(!_.isString(v) || v.length<1) {
          return 'Empty message is not allowed';
        }
      },
    };
    this.userId = {
      type: String,
      required: true,
    };
    this.status = {
      type: Number,
      default: true,
      choices: [InviteRequest.STATUS_NEW, InviteRequest.STATUS_ACCEPTED, InviteRequest.STATUS_DECLINED],
      default: InviteRequest.STATUS_NEW,
    };
  }
  
  get key() {
    const key = NodeRSA();
    key.importKey(Buffer.from(this.userId, 'base64'), 'pkcs1-public-der')
    return key;
  }
  
  get shortUserId() {
    return sha1(Buffer.from(this.userId, 'base64'));
  }
  
  get messageHtml() {
    return _.escape(this.message).replace(/\n/g,'<br/>');
  }
  
  async isDuplicate() {
    const {forumId, userId} = this;
    const dup = await InviteRequest.findOne({forumId, userId});
    return dup !== null;
  }

  static collectionName() {
    return 'invite-requests';
  }
  
  postSave() {
    Vue.eventBus.$emit('inviteSaved', this);
  }
  
  postDelete() {
    Vue.eventBus.$emit('inviteDeleted', this);
  }
}