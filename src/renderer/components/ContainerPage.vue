<template>
<div>
  <b-card v-if="image" class="my-2" title="Generated container image">
    <div>
      <b-img fluid :src="image" class="my-1" />
    </div>
    <b-button variant="primary" @click="saveImage">
      Save container
    </b-button>
  </b-card>
  <template v-if="!messages">
    <font-awesome-icon icon="spinner" spin />
  </template>
  <template v-else v-if="messages.length==0">
    <b-alert show>No pending messages</b-alert>
  </template>
  <template v-else>
    <b-button variant="primary" @click="selectImage" class="my-3">
      Select image
    </b-button>
    <b-card title="Pending messages">
      <b-card-group deck v-for="messagesChunk,i in messageChunks" :key="i">
        <Message v-for="message in messagesChunk"
         :key="message.id"
         :message="message"
         removeButton
         @remove="remove"
        />
      </b-card-group>
    </b-card>
  </template>
</div>
</template>

<script>
import _ from 'lodash';
import Message from './Message';
import MessageModel from '../models/Message';
import PlaceModel from '../models/Place';
const { dialog } = require('electron').remote;
import ImageContainer from '../ImageContainer';
import fs from 'fs';

export default {
  name: 'container-page',
  components: {
    Message,
  },
  data() {
    return {
      messages: [],
      places: [],
      image: null,
      imageContainer: null,
    };
  },
  computed: {
    messageChunks() {
      return _.chunk(this.messages,2);
    }
  },
  methods: {
    async load() {
      [this.messages, this.places] = await Promise.all([
        MessageModel.find({pending:true}, {sort:'-date'}),
        PlaceModel.find({eenabled:true},{sort:'-createdAt'}),
      ]);
    },
    async remove(m) {
      if(!m.parent) {
        await MessageModel.deleteMany({parent:m.id});
        await m.delete();
      }
      else {
        await m.delete();
      }
      await this.load();
    },
    async selectImage() {
      const paths = dialog.showOpenDialog({
        properties:['openFile'],
        filters: [
          {name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif']},
          //{name: 'All Files', extensions: ['*']}
        ],
      });
      if(!_.isArray(paths)) {
        return;
      }
      const image = await ImageContainer.fromFile(paths[0]);
      for(let i=0; i<this.messages.length; i++) {
        const message=this.messages[i];
        try{
          image.writeBlock(message);
        }
        catch(e) {
          break;
        }
      }
      for(let i=0; i<this.places.length; i++) {
        const place = this.places;
        try{
          image.writeBlock(place);
        }
        catch(e) {
          break;
        }
      }
      this.image = await image.getBase64('image/png');
      this.imageContainer = image;
    },
    async saveImage() {
      const path = dialog.showSaveDialog({
        filters: [
          {name: 'Container image', extensions: ['png']},
          //{name: 'All Files', extensions: ['*']}
        ],
      });
      if(!_.isString(path)) {
        return;
      }
      if(fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
      this.imageContainer.save(path);
    },
  },
  created() {
    this.load();
  }
};
</script>