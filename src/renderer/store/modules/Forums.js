import Forum from '../../models/Forum'

const state = {
  loaded: false,
  loading: false,
  data: [1],
}

const mutations = {
  START_LOADING (state) {state.data=[2];
    state.loading = true;
  },
  SET_FORUMS (state, {data}) {
    state.loading = false;
    state.loaded = true;
    state.data = data;
  },
}

const actions = {
  async load ({ state, commit }) {
    if(state.loading) {
      return;
    }
    commit('START_LOADING');
    const forums = (await Forum.find({})).map(({_id, title, isAdmin, isKeySet})=>({_id, title, isAdmin, isKeySet}));
    commit('SET_FORUMS', { data: forums });
  }
}


export default {
  namespaced: true,
  state,
  mutations,
  actions
}
