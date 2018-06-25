<template>
<div>
  <b-modal v-model="visible" :title="updating?'Updating':'Updated'" :hide-footer="updating" ok-only @hide="hide"  size="lg">
    <b-table striped hover :items="stat"></b-table>
    <template v-if="updateStatus.urls.length>0">
      <h3>Downloaded:</h3>
      <ul>
        <li v-for="url in updateStatus.urls" :key="url">{{url}}</li>
      </ul>
    </template>
    <Loader v-if="updating" />
  </b-modal>
</div>
</template>

<script>
import Loader from './Loader'
import ForumModel from '../models/Forum'
import Message from '../models/Message'
import Place from '../models/Place'
import TextContainer from '../helpers/TextContainer'
import queue from 'async/queue'
import axios from 'axios'
import cheerio from 'cheerio'
import ImageContainer from "../ImageContainer"
import url from 'url'
import {isHttpUri, isHttpsUri} from 'valid-url'


export default {
  name: 'update-modal',
  data() {
    return {
      visible: false,
      updating: false,
      updateStatus: {
        urls: [],
        newForums: 0,
        newMessages: 0,
      },
    };
  },
  computed: {
    stat() {
      const {newForums, newMessages} = this.updateStatus;
      return [{
        newForums,
        newMessages,
        requests: this.updateStatus.urls.length,
      }];
    }
  },
  components: {
    Loader,
  },
  methods: {
    async update() {
      this.visible = true;
      this.updating = true;
      this.updateStatus.urls = [];
      this.updateStatus.newForums = 0;
      this.updateStatus.newMessages = 0;
      const imagesQueue = queue(async (task, callback) => {
        try {
          const response = await axios({url: task.url, method: 'GET', responseType: 'arraybuffer'});
          if ([200,304].indexOf(response.status)!==-1 && this._.get(response.headers, 'content-type', 'image/png').toLowerCase() === 'image/png' ) {
            this.updateStatus.urls.push(task.url);
            const container = await ImageContainer.fromBuffer(Buffer.from(response.data));
            container.forum = task.forum;
            for (let i = 0; i < 4096; i++) {
              let block;
              try {
                block = await container.readBlock();
                if(block === null) {
                  break;
                }
              } catch (e) {
                console.log(e);
                break;
              }
              if (block instanceof Message) {
                this.updateStatus.newMessages++;
              }
            }
          }
        } catch (e) {
          console.log(e);
        }
        this.updateStatus.imagesVisited++;
        callback();
      });
      const placesQueue = queue(async (place, callback) => {
        try {
          const page = await axios.get(place.url);
          if ([200, 304].indexOf(page.status) !== -1) {
            this.updateStatus.urls.push(place.url);
            const $ = cheerio.load(page.data);
            for(let el of $('[id^=post_message_]').get()) {
              let forum = null;
              let links = [];
              const fontTags = $(el).find('font[face]').get();
              for(let elFont of fontTags) {
                try {
                  const containerResult = await TextContainer.processData($(elFont).attr('face'));
                  forum = containerResult.forum;
                  const isNew = containerResult.isNew;
                  const messages = containerResult.messages;
                  this.updateStatus.newMessages += messages.length;
                  if(isNew) {
                    this.updateStatus.newForums++;
                  }
                }
                catch(e) {
                  console.log(e, e.stack);
                }
              };
              if(forum) {
                for(const elImg of $('img[src]', el).get()) {
                  let link = this._.get(elImg, 'attribs.src', null);
                  if(this._.isString(link)) {
                    try {
                      link = url.resolve(place.url, link);
                      console.log(link);
                      if(isHttpUri(link)||isHttpsUri(link)) {
                        links.push({url: link, forum});
                      }
                    }
                    catch(e) {
                      console.log(e);
                    }
                  }
                };
                for(const elLink of $('a[href]', el).get()) {
                  let link = this._.get(elImg, 'attribs.href', null);
                  if(this._.isString(link)) {
                    try {
                      link = url.resolve(place.url, link);
                      console.log(link);
                      if(isHttpUri(link)||isHttpsUri(link)) {
                        links.push({url: link, forum});
                      }
                    }
                    catch(e) {
                      console.log(e);
                    }
                  }
                };
              }
              links = this._.uniq(links);
              this.updateStatus.images += links.length;
              imagesQueue.push(links);
            };
            let nextUrl = $('.pagenav a[rel=next]').attr('href');
            if(nextUrl) {
              try {
                nextUrl = url.resolve(place.url, nextUrl);
                place.url = nextUrl;
                await place.save();
                placesQueue.push(place);
              }
              catch(e){}
            }
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
        placesQueue.push(places);
        await new Promise((resolve, reject) => {
          placesQueue.drain = (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
            placesQueue.drain = ()=>void 0;
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
              imagesQueue.drain = ()=>void 0;
            };
          });
        }
      }
      this.updating = false;
    },
    async hide(e) {
      if (this.updating) {
        if(e) {
          e.preventDefault();
        }
        return;
      }
      this.visible = false;
    },
  }
}
</script>

<style>
  
</style>
