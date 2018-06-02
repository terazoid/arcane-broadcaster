<template>
<div>
  <b-form @submit.prevent @submit="post">
    <b-form-group label="Message" :invalid-feedback="messageError">
      <b-form-textarea v-model="message" :rows="5" :max-rows="10" :autofocus="autofocus" :state="messageError===null?null:false" />
    </b-form-group>
    <b-form-invalid-feedback v-if="formErrors.length>0">
      <ul v-for="error in formErrors">
        <li>{{error.message}}</li>
      </ul>
    </b-form-invalid-feedback>
    <button v-if="showPostButton" type="submit" class="btn btn-primary">Post</button>
  </b-form>
</div>
</template>

<script>
import _ from 'lodash';

export default {
  name: 'ReplyForm',
  props: {
    autofocus: Boolean,
    errors: {
      type: Array,
      default () {
        return [];
      },
    },
    showPostButton: {
      type: Boolean,
      default: true,
    }
  },
  data() {
    return {
      message: '',
    };
  },
  computed: {
    formErrors() {
      return _.filter(this.errors, {
        field: '*'
      });
    },
    messageError() {
      return _.get(_.find(this.errors, {
        field: 'message'
      }), 'message', null);
    },
  },
  methods: {
    post() {
      const {
        message
      } = this;
      this.$emit('post', {
        message
      });
    },
    clear() {
      this.message = '';
    }
  }
}
</script>

<style>
  
</style>
