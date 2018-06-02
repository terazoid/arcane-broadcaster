import Document from '../camo/lib/document';
import {isHttpUri, isHttpsUri} from 'valid-url';

export default class Place extends Document {  
  constructor() {
    super();

    this.url = {
      type: String,
      unique: true,
      validate(val) {
        if(!isHttpUri(val) && !isHttpsUri(val)) {
            return 'Invalid url';
        }
      }
    };
    this.enabled = {
      type: Boolean,
      default: true,
    };
    this.createdAt = {
      type: Date,
      default: Date.now,
    };
  }

  static collectionName() {
    return 'places';
  }
}