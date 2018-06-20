<template>
<div>
  <div v-if="forum===null || thread===null || messages===null">
    <font-awesome-icon icon="spinner" spin />
  </div>
  <div v-else>
    <b-breadcrumb :items="breadcrumbs"/>
    <Message
     :key="thread.id"
     :message="thread"
     :removeButton="thread.pending"
     @remove="remove"
     opPost
    />
    <Message v-for="message in messages"
     :key="message.id"
     :message="message"
     :removeButton="message.pending"
     @remove="remove"
    />
    <div>
      <reply-form @post="reply" ref="replyForm" :errors="errors" />
    </div>
  </div>
</div>
</template>

<script>
import _ from 'lodash';
import Message from './Message';
import Forum from '../models/Forum';
import Identity from '../models/Identity';
import MessageModel from '../models/Message';
import ReplyForm from './ReplyForm';

export default {
  name: 'thread-page',
  components: {
    Message,
    ReplyForm,
  },
  data() {
    return {
      //thread : null,
      //messages: [],
      errors: [],
      changed: false,
      r: 0,
    };
  },
  asyncComputed: {
    forum() {
      return Forum.findOne({_id:this.$route.params.forumId});
    },
    thread() {
      this.r;
      return MessageModel.findOne({forumId:this.$route.params.forumId, uniqueId:this.$route.params.threadId,parent:{ $exists: false }});
    },
    messages() {
      this.r;
      return MessageModel.find({forumId:this.$route.params.forumId, parent:this.$route.params.threadId},{sort:'date'});
    },
  },
  computed: {
    breadcrumbs(){
      if(this.forum===null || this.thread===null || this.messages===null) {
        return [];
      }
      return [{
        text: 'Forums',
        to: {name: 'forums'},
      }, {
        text: this.forum.title,
        to: {name: 'forum', params: {forumId:this.forum._id}},
      }, {
        text: this.thread.uniqueId,
        active: true
      }];
    },
  },
  methods: {
    async remove(m) {
      if(m.parent!=this.$route.params.threadId) {
        await MessageModel.deleteMany({parent:m.id});
        await m.delete();
        this.$router.push({name:'forum', params:{forumId:this.$route.params.forumId}});
      }
      else {
        await m.delete();
        this.r = Math.random();
      }
    },
    reply({message}) {
      this.errors=[];
      const identity = Identity.instance();
      const userId = identity.stringId;
      const {forumId, threadId} = this.$route.params;
      const m = MessageModel.create({
        message,
        pending: true,
        forumId,
        userId,
        parent: threadId,
      });
      m.sign = identity.key.sign(m.uniqueId, 'base64');
      m.save().then((t) => {
        this.$refs.replyForm.clear();
        //this.r = Math.random();
      }).catch((e) => {
        if (this._.get(e, 'className') === 'ValidationError') {
          this.errors.push({
            field: e.field,
            message: e.message
          });
        } else {
          this.errors.push({
            field: '*',
            message: e.message
          });
        }
        console.log(e);
      });
    },
    _messageSavedHandler(m) {
      if(m.forumId == this.forum._id && (m.parent == this.thread.uniqueId || m.uniqueId == this.thread.uniqueId)) {
        this.r = Math.random();
      }
    },
    _messageDeletedHandler(m) {
      if(m.forumId == this.forum._id) {
        if(m.parent == this.thread.uniqueId) {
          this.r = Math.random();
        }
        else if( m.uniqueId == this.thread.uniqueId) {
          this.$router.push({name:'forum', params:{forumId:this.$route.params.forumId}});
        }
      }
    },
  },

  async created() {
    this.$eventBus.$on('messageSaved', this._messageSavedHandler);
    this.$eventBus.$on('messageDeleted', this._messageDeletedHandler);
  },
  beforeDestroy() {
    this.$eventBus.$off('messageSaved', this._messageSavedHandler);
    this.$eventBus.$off('messageDeleted', this._messageDeletedHandler);
  }
  /*created() {
    this.load();
  }*/
};
</script>