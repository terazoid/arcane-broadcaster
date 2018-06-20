import Vue from 'vue'
import axios from 'axios'
import * as camo from './camo'
import path from 'path'
const remote = require('electron').remote;
const app = remote.app;

import App from './App'
import router from './router'
import store from './store'
import AsyncComputed from 'vue-async-computed'
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import './fa.config';
import './useComponents';

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false
Vue.use(AsyncComputed, {
  useRawError: true,
  errorHandler (err) {
    console.log('An error occurred!')
    console.log('The error message was: ' + err.msg)
    console.log('And the stack trace was:')
    console.log(err.stack)
  }
});
Vue.use(BootstrapVue);
Vue.eventBus = Vue.prototype.$eventBus = new Vue();
Vue.prototype._ = require('lodash');

camo.connect('nedb://'+path.join(app.getPath('userData'), 'board')).then(function(db) {
    Vue.prototype.$db = db;console.log(db);
    /* eslint-disable no-new */
    new Vue({
      components: { App },
      router,
      store,
      template: '<App/>'
    }).$mount('#app')
});

remote.globalShortcut.register('CommandOrControl+Shift+K', () => {
  remote.BrowserWindow.getFocusedWindow().webContents.openDevTools()
})

window.addEventListener('beforeunload', () => {
  remote.globalShortcut.unregisterAll()
})