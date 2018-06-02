import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/places',
      name: 'places',
      component: require('@/components/PlacesPage').default,
    },
    {
      path: '/thread/:id',
      name: 'thread',
      component: require('@/components/ThreadPage').default
    },
    {
      path: '/container',
      name: 'container',
      component: require('@/components/ContainerPage').default
    },
    {
      path: '/',
      name: 'threads',
      component: require('@/components/ThreadsPage').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
