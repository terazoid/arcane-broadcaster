<template>
<div>
  <template v-if="items === null">
    <Loader />
  </template>
  <template v-else>
    <ContainerModal v-if="inviteResponse" @hide="inviteResponse=null" :forum="inviteForum" :blocks="inviteResponse" />
    <h1>Invites</h1>
    <b-alert show v-if="items.length==0">
      Invites list is empty
    </b-alert>
    <div v-for="d in items">
      <b-card class="mb-3">
        <div slot="header" class="mb-0">
          {{d.forum.title}}
        </div>
        <div class="card-body" v-for="invite in d.invites">
          <b-card class="mb-3">
            <div slot="header" class="mb-0">
              {{invite.shortUserId}}
            </div>
            <div v-html="invite.messageHtml"></div>
            <div slot="footer">
              <b-button @click="accept(d.forum,invite)" variant="success">Accept</b-button>
              <b-button @click="decline(d.forum,invite)" variant="danger">Decline</b-button>
            </div>
          </b-card>
        </div>
        <div slot="footer">
          <b-button @click="acceptAll(d.forum, d.invites)" variant="success">Accept all</b-button>
          <b-button @click="declineAll(d.forum, d.invites)" variant="danger">Decline all</b-button>
        </div>
      </b-card>
    </div>
  </template>
</div>
</template>

<script>
import Loader from './Loader'
import Forum from '../models/Forum'
import ContainerModal from './ContainerModal'
import InviteRequest from '../models/InviteRequest'
import InviteResponse from '../models/InviteResponse'

export default {
  name: 'invites-page',
  components: {
    Loader,
    ContainerModal,
  },
  data() {
    return {
      r: 0,
      inviteForum: null,
      inviteResponse: null,
    };
  },
  asyncComputed: {
    async items() {
      this.r;
      const invites = await InviteRequest.find({status:InviteRequest.STATUS_NEW});
      const forumIds = this._.uniq(invites.map(i=>i.forumId));
      const forums = await Forum.find({_id:{$in:forumIds}});
      return forums.map(forum=>({
        forum,
        invites: this._.filter(invites, {forumId: forum._id}),
      }));
    },
  },
  methods: {
    _inviteSavedHandler(m) {
      this.r = Math.random();
    },
    accept(forum, invite) {
      this.inviteForum = forum;
      this.inviteResponse = [InviteResponse.fromRequest(invite, forum)];
    },
    decline(forum, invite) {
      invite.status = InviteRequest.STATUS_DECLINED;
      invite.save();
    },
    acceptAll(forum, invites) {
      this.inviteForum = forum;
      this.inviteResponse = invites.map(i=>InviteResponse.fromRequest(i, forum));
    },
    async declineAll(forum, invites) {
      await Promise.all(invites.map(invite=>{
        invite.status = InviteRequest.STATUS_DECLINED;
        return invite.save();
      }));
    },
  },
  async created() {
    this.$eventBus.$on('inviteSaved', this._inviteSavedHandler);
  },
  beforeDestroy() {
    this.$eventBus.$off('inviteSaved', this._inviteSavedHandler);
  },
}
</script>