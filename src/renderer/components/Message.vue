<template>
<b-card class="mb-3" :border-variant="message.pending?'info':'dark'">
  <div slot="header" class="mb-0">
    <div class="card-title">
      <div class="pull-left">
        <span v-b-tooltip.hover title="Message ID" class="message-id">
          {{message.uniqueId}}
        </span>
        <span v-b-tooltip.hover title="User ID" class="user-id">
          {{shortId}}
          <span v-if="isYou" class="is-you">(You)</span>
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
import Identity from '../models/Identity'
import sha1 from 'node-sha1'
import BBCodeParser from 'bbcode-parser'
import BBTag from 'bbcode-parser/bbTag'

const yourId = Identity.instance().stringId;
const bbCodeTags = {
  'b': new BBTag("b", true, false, false),
  'i': new BBTag("i", true, false, false),
  'u': new BBTag("u", true, false, false),
  's': new BBTag("s", true, false, false),
  'img': new BBTag("img", true, false, false, (tag, content, attr) => {
    return "<img src=\"" + content + "\" />";
  }),
};
const parser = new BBCodeParser(bbCodeTags, {escapeHTML:true});

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
      let html = parser.parseString(this.message.message);
      html = html.replace(/^>.+$/gm, '<span class="quote">$0</span>');
      return html;
      //return this._.escape(this.message.message).replace(/\n/g,'<br/>');
    },
    isYou() {
      return yourId === this.message.userId;
    },
    shortId() {
      return sha1(Buffer.from(this.message.userId, 'base64'));
    },
  },
}
</script>

<style>
.pull-right {
  float: right;
}
.message-id {
  color: #999;
}
.user-id {
  color: #789922;
}
.is-you {
  color: #505a7a;
}
.quote {
  color: #b5bd68;
}
</style>
