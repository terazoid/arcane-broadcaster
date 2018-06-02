<template>
<b-container>
  <div v-if="!thread || !messages">
    <font-awesome-icon icon="spinner" spin />
  </div>
  <div v-else>
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
</b-container>
</template>

<script>
import _ from 'lodash';
import Message from './Message';
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
      thread : null,
      messages: [],
      errors: [],
    };
  },
  methods: {
    async load() {
      [this.thread, this.messages] = await Promise.all([
        MessageModel.findOne({_id:this.$route.params.id,parent:{ $exists: false }}),
        MessageModel.find({parent:this.$route.params.id},{sort:'date'}),
      ]);
    },
    async remove(m) {
      if(m.parent!=this.$route.params.id) {
        await MessageModel.deleteMany({parent:m.id});
        await m.delete();
        this.$router.push({name:'threads'});
      }
      else {
        await m.delete();
        await this.load();
      }
    },
    reply({message}) {
      this.errors=[];
      const m = MessageModel.create({
        message,
        pending: true,
        parent: this.$route.params.id,
      });
      m.save().then((t)=>{
        this.errors = [];
        this.$refs.replyForm.clear();
        this.load();
      }).catch((e)=>{
        if(_.get(e,'className') === 'ValidationError') {
          this.errors.push({field:e.field, message:e.message});
        }
        else {
          this.errors.push({field: '*', message:e.message});
        }
      });
    },
  },
  created() {
    this.load();
  }
};
</script>