import Vue from 'vue';
import _ from 'lodash'
import NodeRSA from 'node-rsa'
import aesjs from 'aes-js'
import sha1 from 'node-sha1'
import InviteRequest from './InviteRequest'
import Forum from './Forum'

export default class InviteResponse {
  
  constructor(data) {
    this.forumId = data.forumId;
    this.userId = data.userId;
    this.aesKey = data.aesKey;
    this.sign = data.sign;
  }
  
  get userKey() {
    const key = NodeRSA();
    key.importKey(Buffer.from(this.userId, 'base64'), 'pkcs1-public-der')
    return key;
  }
  
  static fromRequest(req, forum) {
    if(!(forum instanceof Forum)) {
      throw new Error('Expected instance of Forum');
    }
    if(!(req instanceof InviteRequest)) {
      throw new Error('Expected instance of InviteRequest');
    }
    if(!forum.isAdmin) {
      throw new Error("Can't create InviteRequest for forum without admin privileges");
    }
    return new InviteResponse({
      userId: req.userId,
      forumId: req.forumId,
      aesKey: forum.aesKey,
      sign: forum.rsaKeyObject.sign(Buffer.from(`${req.forumId}:${req.userId}`)),
    });
  }
  
  static verify({userId}, sign, forum) {
    if(!(forum instanceof Forum)) {
      throw new Error('Expected instance of Forum');
    }
    return forum.rsaKeyObject.verify(Buffer.from(`${forum._id}:${userId}`), sign);
  }
}