<template>
<div id="app">
  <Header />
  <router-view></router-view>
</div>
</template>

<script>
import Header from './components/Header';

export default {
  name: 'arcane-broadcaster',
  components: {
    Header,
  },
}
</script>

<style>
#app {
  padding-top: 70px;
}
</style>
