<template>
<div>
  <b-modal v-model="visible" title="Invite request" ok-title="Create" @ok="ok" @hide="hide" size="lg">
      <b-form-group label="Message" :invalid-feedback="messageError">
        <b-form-textarea v-model="message" :rows="5" :max-rows="10" :autofocus="true" :state="messageError===null?null:false" />
      </b-form-group>
      <b-form-invalid-feedback v-if="formErrors.length>0">
        <ul v-for="error in formErrors">
          <li>{{error.message}}</li>
        </ul>
      </b-form-invalid-feedback>
    </b-form>
  </b-modal>
</div>
</template>

<script>
import InviteRequest from '../models/InviteRequest';
import Forum from '../models/Forum';
import Identity from '../models/Identity'

export default {
  name: 'invite-request-form',
  data() {
    return {
      visible: false,
      message: '',
      errors: [],
    };
  },
  props: {
    forum: {
      type: Forum,
      required: true,
    },
  },
  methods: {
    show() {
      this.message = '';
      this.visible = true
    },
    ok() {
      this.errors = [];
      const {message} = this;
      const forumId = this.forum._id;
      const userId = Identity.instance().stringId;
      const m = InviteRequest.create({message, forumId, userId});
      try{
        m.validate();
        this.$emit('created', m);
        this.hide();
      }
      catch(e) {
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
      }
    },
    hide(e) {
      if (e && e.trigger === 'ok') {
        e.preventDefault();
        return;
      }
      this.message = '';
      this.visible = false;
    }
  },
  computed: {
    formErrors() {
      return this._.filter(this.errors, {
        field: '*'
      });
    },
    messageError() {
      return this._.get(this._.find(this.errors, {
        field: 'message'
      }), 'message', null);
    },
  },
}
</script>

<style>
  
</style>
