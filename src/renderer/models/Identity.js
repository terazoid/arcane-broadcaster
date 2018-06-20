import _ from 'lodash'
import NodeRSA from 'node-rsa'
import sha1 from 'node-sha1'

export default class Identity {
	static _instance = null;

	constructor({
		key
	}) {
		this.key = key = NodeRSA(key);
	}

	save() {
		localStorage.setItem('identity', JSON.stringify({
			key: this.key.exportKey('pkcs1-private-pem'),
		}));
	}
  
  get stringId() {
    return this.key.exportKey('pkcs1-public-der').toString('base64');
  }

	get shortId() {
		return sha1(this.key.exportKey('pkcs1-public-der'));
	}

	static instance() {
		if (!Identity._instance) {
			let save = false;
			let data = localStorage.getItem('identity');
			if (data) {
				data = JSON.parse(data);
			} else {
				const key = NodeRSA({
					b: 2048
				});
				data = {
					key: key.exportKey('pkcs1-private-pem'),
				};
        save = true;
			}
			Identity._instance = new Identity(data);
      if(save) {
        Identity._instance.save();
      }
		}

		return Identity._instance;
	}
}