<template>
  <b-modal v-model="visible" title="Create new thread" ok-title="Create" @ok="newThreadOk" @hide="hide" size="lg">
    <ReplyForm @post="post" ref="replyForm" :showPostButton="false" autofocus :errors="errors" />
  </b-modal>
</template>

<script>
import MessageModel from '../models/Message'
import ReplyForm from './ReplyForm'
import Identity from '../models/Identity'

export default {
  name: 'new-thread-form',
  components: {
    ReplyForm,
  },
  data() {
    return {
      visible: false,
      errors: [],
    };
  },
  props: {
    forumId: {
      type: String,
      required: true,
    },
  },
  methods: {
    show() {
      this.visible = true;
    },
    newThreadOk(e) {
      e.preventDefault();
      this.$refs.replyForm.post();
    },
    post({
      message
    }) {
      this.errors = [];
      const {forumId} = this;
      const identity = Identity.instance();
      const userId = identity.stringId;
      const m = MessageModel.create({
        message,
        pending: true,
        forumId,
        userId,
      });
      m.sign = identity.key.sign(m.uniqueId, 'base64');
      m.save().then((t) => {
        this.$refs.replyForm.clear();
        this.visible = false;
        this.$emit('created', m);
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
    async hide(e) {
      if (e && e.trigger === 'ok') {
        e.preventDefault();
        return;
      }
      this.visible = false;
      this.errors = [];
    },
  }
}
</script>

<style>
  
</style>
