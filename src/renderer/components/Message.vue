<template>
<b-card class="mb-3" :border-variant="message.pending?'info':'dark'">
  <div slot="header" class="mb-0">
    <div class="card-title">
      <div class="pull-left">
        <span v-b-tooltip.hover title="ID">
          {{message.id}}
        </span>
      </div>
    </div>
  </div>
  <div class="card-body" v-html="messageHtml">
  </div>
  <div slot="footer">
    <div>
      <time class="pull-right">
        <font-awesome-icon :icon="['far', 'calendar']" /> {{ message.formattedDate }}
        <font-awesome-icon :icon="['far', 'clock']" /> {{ message.formattedTime }}
      </time>
      <span v-if="message.pending" v-b-tooltip.hover title="Pending">
        <font-awesome-icon icon="broadcast-tower" /> 
      </span>
      <b-button v-if="replyButton" size="sm" variant="outline-dark" @click="$emit('reply', message)" v-b-tooltip.hover title="Reply">
        <font-awesome-icon icon="reply" />
      </b-button>
      <b-button v-if="removeButton" size="sm" variant="outline-danger" @click="$emit('remove',message)">
        <font-awesome-icon icon="trash" />
      </b-button>
    </div>
  </div>
</b-card>
</template>

<script>
export default {
  name: 'message',
  props: {
    removeButton: Boolean,
    replyButton: Boolean,
    showLink: {
      type: Boolean,
      default: false,
    },
    opPost: {
      type: Boolean,
      default: false,
    },
    message: Object,
  },
  computed: {
    messageHtml() {
      return this._.escape(this.message.message).replace(/\n/g,'<br/>');
    },
  }
}
</script>

<style>
.pull-right {
  float: right;
}
</style>
