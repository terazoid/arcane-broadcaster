<template>
<div>
  <div v-for="forum in forums" :key="forum._id">
    {{forum.title}}
    {{forum.isAdmin}}
    <b-button variant="primary" @click="modal=forum._id">Share</b-button>
  </div>
  <ContainerModal v-if="modal!==null && modalForum!==null" @hide="modal=null" :forum="modalForum" />
</div>
</template>

<script>
import ContainerModal from './ContainerModal'
import Forum from '../models/Forum'

export default {
  name: 'forums-page',
  components: {
    ContainerModal,
  },
  data() {
    return {
      modal: null,
    };
  },
  asyncComputed: {
    modalForum() {
      return Forum.findOne({_id:this.modal});
    },
  },
  computed: {
    forums() {
      return this.$store.state.Forums.data;
    },
  }
};
</script>