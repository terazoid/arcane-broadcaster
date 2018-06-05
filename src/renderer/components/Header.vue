<template>
<div>
  <b-navbar toggleable="md" type="dark" variant="dark" fixed="top">
    <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
    <b-collapse is-nav id="nav_collapse">
      <b-navbar-nav>
        <b-nav-item :to="{name:'threads'}">Threads</b-nav-item>
        <b-nav-item :to="{name:'places'}">Places</b-nav-item>
        <b-button variant="success" class="my-0 mx-md-2" @click="newThread.visible=true">New thread</b-button>
        <b-button variant="info" class="my-0 mx-md-2" :disabled="updating" @click="update">Load messages</b-button>
        <b-button :to="{name:'container'}" variant="primary" class="my-0 mx-md-2">Create container</b-button>
        <b-button v-if="false" variant="danger" class="my-0 mx-md-2" @click="clearMessages">Clear messages</b-button>
      </b-navbar-nav>
    </b-collapse>
  </b-navbar>
  <b-modal v-model="newThread.visible" title="Create new thread" ok-title="Post" @ok="newThreadOk">
    <ReplyForm @post="postNewThread" ref="newThreadForm" :showPostButton="false" autofocus />
  </b-modal>
  <b-modal v-model="updating" title="Loading new messages" hide-footer no-close-on-backdrop no-close-on-esc>
    <h3>Places: <strong>{{ updateStatus.placesVisited }} / {{ updateStatus.places }}</strong></h3>
    <b-progress :max="updateStatus.places">
      <b-progress-bar :value="updateStatus.placesVisited">
        {{ updateStatus.placesVisited }} / {{ updateStatus.places }}
      </b-progress-bar>
    </b-progress>
    <h3>Images: <strong>{{ updateStatus.imagesVisited }} / {{ updateStatus.images }}</strong></h3>
    <b-progress :max="updateStatus.images">
      <b-progress-bar :value="updateStatus.imagesVisited">
        {{ updateStatus.imagesVisited }} / {{ updateStatus.images }}
      </b-progress-bar>
    </b-progress>
  </b-modal>
</div>
</template>

<script>
import _ from 'lodash';
import ReplyForm from './ReplyForm';
import Message from '../models/Message';
import Place from '../models/Place';
import queue from 'async/queue';
import axios from 'axios';
import cheerio from 'cheerio';
import ImageContainer from "../ImageContainer";
import url from 'url';
import {isHttpUri, isHttpsUri} from 'valid-url';

export default {
  name: 'Header',
  data() {
    return {
      updating: false,
      updateStatus: {
        places: 0,
        placesVisited: 0,
        images: 0,
        imagesVisited: 0,
      },
      newThread: {
        visible: false,
        errors: [],
      },
    };
  },
  methods: {
    newThreadOk(e) {
      e.preventDefault();
      this.$refs.newThreadForm.post();
    },
    postNewThread({
      message
    }) {
      this.newThread.errors = [];
      const m = Message.create({
        message,
        pending: true,
      });
      m.save().then((t) => {
        this.$refs.newThreadForm.clear();
        this.newThread.visible = false;
        this.$router.push({
          name: 'thread',
          params: {
            id: t.id
          }
        });
      }).catch((e) => {
        if (_.get(e, 'className') === 'ValidationError') {
          this.newThread.errors.push({
            field: e.field,
            message: e.message
          });
        } else {
          this.newThread.errors.push({
            field: '*',
            message: e.message
          });
        }
        console.log(e);
      });
    },
    async update() {
      this.updating = true;
      this.updateStatus = {
        places: 0,
        placesVisited: 0,
        images: 0,
        imagesVisited: 0,
      };
      const imagesQueue = queue(async (task, callback) => {
        try {
          const response = await axios({url: task.url, method: 'GET', responseType: 'arraybuffer'});
          if ([200,304].indexOf(response.status)!==-1 && _.get(response.headers, 'content-type', 'image/png').toLowerCase() === 'image/png' ) {
            console.log('Downloaded: '+task.url);
            const container = await ImageContainer.fromBuffer(Buffer.from(response.data));
            for (let i = 0; i < 4096; i++) {
              let block;
              try {
                block = container.readBlock();
              } catch (e) {console.log(e);
                break;
              }
              if (block instanceof Message) {
                const old = await Message.findOne({
                  _id: block.id
                });
                if (old === null) {
                  block.pending = false;
                  block.save();
                }
                else {
                  old.pending = false;
                  old.save();
                }
              } else if (block instanceof Place) {
                if (await Place.find({
                    url: block.url
                  }) === null) {
                  block.save();
                }
              }
            }
          }
        } catch (e) {
          console.log(e);
        }
        this.updateStatus.imagesVisited++;
        callback();
      });
      const placesQueue = queue(async (task, callback) => {
        try {
          const page = await axios.get(task.url);
          if ([200, 304].indexOf(page.status) !== -1) {
            const $ = cheerio.load(page.data);
            let links = [];
            $('a[href] img').each((i, el) => {
              const url = $(el).parents('a').attr('href');
              if(_.isString(url)) {
                links.push(url);
              }
            });
            $('img').each((i, el) => {
              const url = $(el).attr('src');
              if(_.isString(url)) {
                links.push(url);
              }
            });
            console.log(links);
            links = links.map((link) => {
              try {
                return url.resolve(task.url, link);
              }
              catch(e) {
                return void 0;
              }
            });
            links = _.filter(links, link=>link&&(isHttpUri(link)||isHttpsUri(link)));
            links = _.uniq(links);
            this.updateStatus.images += links.length;
            imagesQueue.push(links.map((url) => ({
              url
            })));
          }
        } catch (e) {
          console.log(e);
        }
        this.updateStatus.placesVisited++;
        callback();
      }, 5);
      const places = await Place.find({
        enabled: true
      }, {
        sort: '-createdAt'
      });
      this.updateStatus.places = places.length;
      if(places.length>0) {
        placesQueue.push(places.map((place) => ({
          url: place.url
        })));
        await new Promise((resolve, reject) => {
          placesQueue.drain = (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
            placesQueue.drain = void 0;
          };
        });
        if(imagesQueue.started && imagesQueue.running) {
          await new Promise((resolve, reject) => {
            imagesQueue.drain = (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
              imagesQueue.drain = void 0;
            };
          });
        }
      }
      this.updating = false;
    },
    async clearMessages() {
      await Message.deleteMany({});
    }
  },
  components: {
    ReplyForm,
  }
}
</script>

<style>
  
</style>
