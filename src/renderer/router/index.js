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
      path: '/invites',
      name: 'invites',
      component: require('@/components/InvitesPage').default,
    },
    {
      path: '/container',
      name: 'container',
      component: require('@/components/ContainerPage').default
    },
    {
      path: '/forum/:forumId/thread/:threadId',
      name: 'thread',
      component: require('@/components/ThreadPage').default
    },
    {
      path: '/forum/:forumId',
      name: 'forum',
      component: require('@/components/ForumPage').default,
    },
    {
      path: '/',
      name: 'forums',
      redirect: '/places',
    },
    // {
    //   path: '/',
    //   name: 'forums',
    //   component: require('@/components/ForumsPage').default
    // },
    {
      path: '*',
      redirect: '/',
    }
  ]
})
