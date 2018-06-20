<template>
<b-container fluid class="h-100">
  <b-row class="h-100">
    <b-col cols="3" class="bg-secondary text-white h-100 px-0">
      <Sidebar :identity="identity" />
    </b-col>
    <b-col id="content" class="p-3">
      <Loader v-if="isLoading" />
      <router-view v-else></router-view>
    </b-col>
  </b-row>
  <NewForumForm ref="newForumForm" />
  <UpdateModal ref="updateModal" />
</b-container>
</template>

<script>
import Identity from './models/Identity'
import Sidebar from './components/Sidebar'
import TextContainer from './helpers/TextContainer'
import NewForumForm from './components/NewForumForm'
import UpdateModal from './components/UpdateModal'

import { mapState, mapActions } from 'vuex';

export default {
  name: 'arcane-broadcaster',
  components: {
    Sidebar,
    NewForumForm,
    UpdateModal,
  },
  data() {
    const identity = Identity.instance();
    return {
      identity,
    };
  },
  computed: {
    ...mapState({
      isLoading: state => !state.Forums.loaded
    }),
  },
  methods: {
    ...mapActions({loadForums: 'Forums/load'}),
    newForum() {
      this.$refs.newForumForm.show();
    },
    async updateForums() {
      this.$refs.updateModal.update();
    },
    readText() {
      TextContainer.processData(window.t||'');
    }
  },
  created() {
    this.loadForums();
    this.$eventBus.$on('forumSaved', this.loadForums);
    this.$eventBus.$on('forumDeleted', this.loadForums);
    
    this.$eventBus.$on('newForum', this.newForum);
    this.$eventBus.$on('updateForums', this.updateForums);
    this.$eventBus.$on('readText', this.readText);
  },
  beforeDestroy() {
    this.$eventBus.$off('forumSaved', this.loadForums);
    this.$eventBus.$off('forumDeleted', this.loadForums);
    
    this.$eventBus.$off('newForum', this.newForum);
    this.$eventBus.$off('updateForums', this.updateForums);
    this.$eventBus.$off('readText', this.readText);
  }
}
</script>
<style>
#content{
  overflow-y: auto;
  max-height: 100%;
}
</style>
