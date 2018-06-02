import Vue from 'vue';
import fontawesome from '@fortawesome/fontawesome';
import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import regular from '@fortawesome/fontawesome-free-regular';
import solid from '@fortawesome/fontawesome-free-solid';

fontawesome.config = {
  familyPrefix: 'far',
}
fontawesome.library.add(regular);
fontawesome.library.add(solid);

Vue.component('font-awesome-icon', FontAwesomeIcon);