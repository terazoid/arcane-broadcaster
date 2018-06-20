<template>
  <b-nav vertical class="mx-0" id="sidebar">
    <div class="bg-dark text-white text-center">
      <b-navbar-brand :to="to('forums')" class="text-info">Arcane Broadcaster</b-navbar-brand>
    </div>
    <div class="px-2 py-1">
      <div>
        Your id:
        <div class='myId'>
          {{identity.shortId}}
        </div>
      </div>
      <b-nav-item>
        <b-nav-text tag="button" class="btn btn-block btn-primary" @click="$eventBus.$emit('updateForums')">
          Update
        </b-nav-text>
      </b-nav-item>
      <b-nav-item :to="to('places')">
          Places
      </b-nav-item>
      <b-nav-item :to="to('invites')">
          Invites
      </b-nav-item>
      <b-nav-item>
          Forums
      </b-nav-item>
      <b-nav vertical class="ml-3">
        <b-nav-item :key="forum._id" :to="to('forum', {forumId:forum._id})" v-for="forum in forums">
            {{forum.title}}
        </b-nav-item>
        <b-nav-item key="_new">
          <b-nav-text tag="button" class="btn btn-block btn-success" @click="$eventBus.$emit('newForum')">
            Create new
          </b-nav-text>
        </b-nav-item>
      </b-nav>
      <b-nav-item v-if="false">
        <b-nav-text tag="button" class="btn btn-block btn-warning" @click="$eventBus.$emit('readText')">
          Read text
        </b-nav-text>
      </b-nav-item>
    </div>
  </b-nav>
</template>

<script>
  export default {
    name: 'sidebar',
    props: {
      identity: {
        type: Object,
        required: true,
      },
      updating: {
        type: Boolean,
        default: false,
      },
    },
    methods: {
      to(name, params={}) {
        return {name, params};
      }
    },
    computed: {
      forums() {
        return this.$store.state.Forums.data;
      }
    }
  }
</script>

<style>
  #sidebar .nav-link{
    color: #999
  }
  #sidebar .nav-link.active {
    color: #fff;
  }
  .myId {
    font-size: 0.6rem;
  }
</style>
