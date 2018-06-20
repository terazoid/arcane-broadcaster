<template>
<div>
  <template v-if="!forum">
    <Loader />
  </template>
  <template v-else-if="!forum.isKeySet">
    <InviteRequestForm ref="inviteRequestForm" @created="inviteRequestCreated" :forum="forum" />
    <ContainerModal v-if="inviteRequest" @hide="inviteRequest=null" :forum="forum" :blocks="[inviteRequest]" />
    <b-alert show variant="danger">
      <h1>Access denied</h1>
      <b-button variant="success" @click="$refs.inviteRequestForm.show()">Ask for access</b-button>
    </b-alert>
  </template>
  
  <template v-else-if="threads === null">
    <Loader />
  </template>
  <template v-else>
    <div v-if="changed">
      <b-alert show>
        <div>Some new threads were found.</div>
        <b-button @click="loadThreads" variant="primary">Update page</b-button>
      </b-alert>
    </div>
    
    <NewThreadForm ref="newThreadForm" :forumId="forum._id" @created="loadThreads()" />
    <ContainerModal v-if="shareForumModalVisible" @hide="shareForumModalVisible=false" :forum="forum" />
    <ContainerModal v-if="shareMessagesModalVisible" @hide="shareMessagesModalVisible=false" :forum="forum" :blocks="pendingMessages" allowImage />
    <div class="my-3">
      <b-button-group>
        <b-button @click="$refs.newThreadForm.show()">New thread</b-button>
        <b-button @click="shareForumModalVisible=true">Share forum</b-button>
        <b-button @click="shareMessages">Share posted messages</b-button>
      </b-button-group>
    </div>
    <template v-if="threads.data.length==0">
      <b-alert show>No threads</b-alert>
    </template>
    <div v-else>
      <div>
        <b-col md="6" class="my-1" v-if="perPage<threads.totalRows">
          <b-pagination :total-rows="threads.totalRows" :per-page="perPage" v-model="currentPage" class="my-0" />
        </b-col>
      </div>
      <div class="threads">
        <Message v-for="message in threads.data"
         :key="message.id"
         :message="message"
         :removeButton="message.pending"
         @remove="remove"
         replyButton
         @reply="reply"
        />
      </div>
      <div>
        <b-col md="6" class="my-1" v-if="perPage<threads.totalRows">
          <b-pagination :total-rows="threads.totalRows" :per-page="perPage" v-model="currentPage" class="my-0" />
        </b-col>
      </div>
    </div>
  </template>
</div>
</template>

<script>
import Message from './Message';
import Loader from './Loader';
import MessageModel from '../models/Message';
import Forum from '../models/Forum';
import NewThreadForm from './NewThreadForm';
import ContainerModal from './ContainerModal';
import InviteRequestForm from './InviteRequestForm';

export default {
  name: 'forum-page',
  components: {
    Message,
    Loader,
    NewThreadForm,
    ContainerModal,
    InviteRequestForm,
  },
  data() {
    return {
      currentPage: 1,
      perPage: 10,
      changed: false,
      r: 0,
      shareForumModalVisible: false,
      shareMessagesModalVisible: false,
      pendingMessages: [],
      inviteRequest: null,
    };
  },
  asyncComputed: {
    forum() {
      return Forum.findOne({_id:this.$route.params.forumId});
    },
    threads: {
      async get () {
        if(!this.forum || !this.forum.isKeySet) {
          return null;
        }
        let totalRows = MessageModel.count({forumId: this.forum._id, parent:{ $exists: false }});
        totalRows = await totalRows;
        const threads = await MessageModel.find({forumId: this.forum._id, parent:{ $exists: false }}, {sort:'-date',skip:this.perPage*(this.currentPage-1), limit:this.perPage});
        this.changed = false;
        return {totalRows, data: threads};
      },
      watch() {
        this.r;
      },
    }
  },
  methods: {
    async loadThreads() {
      this.currentPage = 1;
      this.r = Math.random();
    },
    async remove(m) {
      await MessageModel.deleteMany({parent:m.id});
      await m.delete();
      //await this.loadThreads();
    },
    reply(message) {
      const {id} = message;
      this.$router.push({name: 'thread', params:{forumId:this.forum._id,threadId:id}});
    },
    _messageSavedHandler(m) {
      if(this.forum && m.parent == null && m.forumId == this.forum._id) {
        this.changed = true;
      }
    },
    _messageDeletedHandler(m) {
      if(this.forum && m.forumId == this.forum._id) {
        this.loadThreads();
      }
    },
    async shareMessages() {
      this.pendingMessages = await MessageModel.findPendingMessages(this.forum._id);
      this.shareMessagesModalVisible = true;
    },
    inviteRequestCreated(r) {console.log(r);
      this.inviteRequest = r;
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
};
</script>