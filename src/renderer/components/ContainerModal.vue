<template>
<b-modal v-model="visible" :title="title" ok-only @hide="hide" size="lg">
  <b-form-group label="Container type" v-if="!onlyText">
    <b-form-radio-group v-model="type" :options="types">
    </b-form-radio-group>
  </b-form-group>
  <b-form-textarea :rows="5" v-model="message" placeholder="Visible message" @input="visibleMessageChanged" />
  <template v-if="type=='image'">
    <b-button variant="primary" @click="selectImage" class="my-3">
      Select image
    </b-button>
  </template>
  <b-form-textarea :rows="5" label="Message with hidden data" readonly :value="outputMessage" @focus.native="selectOutput" />
  <div>
    Capacity: {{outputMessageCapacity}}
  </div>
  <b-alert show v-if="excessBlocks>0" variant="warning">
    {{excessBlocks}} messages did not fit
  </b-alert>
  <template v-if="type=='image' && image">
    <b-alert show variant="warning" v-if="this.skipped>0">Not enough space. Skipped {{skipped}} message{{skipped>1?'s':''}}</b-alert>
    <b-card class="my-2" title="Generated container image">
      <div>
        <b-img fluid :src="image" class="my-1" />
      </div>
      <b-button variant="primary" @click="saveImage">
        Save container
      </b-button>
    </b-card>
  </template>
</b-modal>
</template>

<script>
import _ from 'lodash';
import Message from './Message';
import MessageModel from '../models/Message';
import Forum from '../models/Forum';
import PlaceModel from '../models/Place';
const { dialog } = require('electron').remote;
import ImageContainer from '../ImageContainer';
import TextContainer from '../helpers/TextContainer';
import fs from 'fs';

export default {
  name: 'container-modal',
  components: {
    Message,
  },
  props: {
    forum: {
      type: Forum,
      required: true,
    },
    blocks: {
      type: Array,
      default: ()=>[],
    },
    allowImage: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    }
  },
  data() {
    const textContainer = new TextContainer();
    return {
      type: 'text',
      visible: true,
      message: '',
      image: null,
      imageContainer: null,
      textContainer,
      skipped: 0,
    };
  },
  computed: {
    types() {
      return [
        { text: 'Image', value: 'image' },
        { text: 'Text', value: 'text' },
      ];
    },
    outputMessage() {
      return this.textContainer.outputMessage;
    },
    outputMessageCapacity() {
      return `${this.textContainer.outputMessage.length}/30000`;
    },
    excessBlocks() {
      return this.textContainer.excessBlocks.length;
    },
    onlyText() {
      return !this.allowImage || this.blocks.length==0;
    },
  },
  watch: {
    type: function (newValue, oldValue) {
      switch(newValue) {
        case 'text':
        this.textContainer.data = this._.concat([this.forum],this.blocks);
        break;
        case 'image':
        this.textContainer.data = this._.concat([this.forum]);
        break;
        default:
        this.textContainer.data = [];
      }
    }
  },
  methods: {
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
      this.skipped = 0;
      const image = await ImageContainer.fromFile(paths[0]);
      image.forum = this.forum;
      for(let i=0; i<this.blocks.length; i++) {
        const message=this.blocks[i];
        try {
          image.writeBlock(message);
        }
        catch(e) {
          this.skipped++;
          console.log(e);
          break;
        }
      }
      try{
        image.writeEom();
      }
      catch(e) {
        
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
    visibleMessageChanged() {
      this.textContainer.message = this.message;
    },
    hide() {
      this.$emit('hide');
    },
    selectOutput(e) {
      e.target.select()
    },
  },
  created() {
    this.textContainer.forum = this.forum;
    this.textContainer.data = this.blocks;
  },
};
</script>