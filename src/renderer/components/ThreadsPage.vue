<template>
<b-container>
  <div v-if="!messages || loading">
    <font-awesome-icon icon="spinner" spin />
  </div>
  <b-row v-else>
    <div>
      <b-col md="6" class="my-1" v-if="perPage<totalRows">
        <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage" class="my-0" @input="loadThreads" />
      </b-col>
    </div>
    <div class="threads">
      <b-card-group deck v-for="messagesChunk,i in messageChunks" :key="i">
        <Message v-for="message in messagesChunk"
         :key="message.id"
         :message="message"
         :removeButton="message.pending"
         @remove="remove"
         replyButton
         @reply="reply"
        />
      </b-card-group>
    </div>
    <div>
      <b-col md="6" class="my-1" v-if="perPage<totalRows">
        <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage" class="my-0" @input="loadThreads" />
      </b-col>
    </div>
  </b-row>
</b-container>
</template>

<script>
import _ from 'lodash';
import Message from './Message';
import MessageModel from '../models/Message';

export default {
  name: 'threads-page',
  components: {
    Message,
  },
  data() {
    return {
      loading: true,
      messages: null,
      currentPage: 1,
      perPage: 10,
      totalRows: 0,
    };
  },
  computed: {
    messageChunks() {
      return _.chunk(this.messages,2);
    }
  },
  methods: {
    async loadThreads() {
      this.loading=true;
      let totalRows = MessageModel.count({parent:{ $exists: false }});
      totalRows = await totalRows;
      this.messages=await MessageModel.find({parent:{ $exists: false }},{sort:'-date',skip:this.perPage*(this.currentPage-1),limit:this.perPage});
      this.totalRows = totalRows;
      this.loading=false;
    },
    async remove(m) {
      await m.delete();
      await this.loadThreads();
    },
    reply(message) {
      const {id} = message;
      this.$router.push({name: 'thread', params:{id}});
    },
  },
  async created() {
    await this.loadThreads();
  }
};
</script>