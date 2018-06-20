<template>
<div>
  <b-modal v-model="visible" title="Create new forum" ok-title="Create" @ok="create" @hide="hide" :busy="busy" size="lg">
    <b-form @submit.prevent="create">
      <b-form-group label="Title" :invalid-feedback="titleError">
        <b-form-input v-model="model.title" :rows="5" :max-rows="10" :autofocus="true" :state="titleError===null?null:false" />
      </b-form-group>
      <b-form-invalid-feedback v-if="formErrors.length>0" force-show>
        <ul v-for="error in formErrors">
          <li>{{error.message}}</li>
        </ul>
      </b-form-invalid-feedback>
    </b-form>
  </b-modal>
</div>
</template>

<script>
import _ from 'lodash';
import ForumModel from '../models/Forum';

export default {
  name: 'NewForumForm',
  data() {
    return {
      model: ForumModel.create(),
      visible: false,
      errors: [],
      busy: false,
    };
  },
  computed: {
    formErrors() {
      return _.filter(this.errors, {
        field: '*'
      });
    },
    titleError() {
      return _.get(_.find(this.errors, {
        field: 'title'
      }), 'message', null);
    },
  },
  methods: {
    show() {
      this.visible = true;
    },
    async create() {
      this.errors = [];
      this.busy = true;
      await this.model.setRandomKeys();
      this.model.save().then((f) => {
        this.busy = false;
        this.hide();
      }).catch((e) => {
        this.busy = false;
        console.log(e);
        if (_.get(e, 'className') === 'ValidationError') {
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
      });
    },
    async hide(e) {
      if (e && e.trigger === 'ok') {
        e.preventDefault();
        return;
      }
      this.visible = false;
      this.errors = [];
      this.model = ForumModel.create();
    },
  }
}
</script>

<style>
  
</style>
