<template>
<b-container>
    <b-form @submit="create" @submit.prevent>
    <div class="row">
      <div class="col-md-10 col-sm-12">
        <b-form-group>
          <input id="url" type="text" class="form-control" :class="{'is-invalid':urlError!==null}" v-model="form.url" placeholder="Url" />
          <b-form-invalid-feedback v-if="urlError" id="inputLiveFeedback">
            {{urlError}}
          </b-form-invalid-feedback>
        </b-form-group>
      </div>
      <div class="col-md-2 col-sm-12">
        <b-button type="submit" variant="primary">Add</b-button>
      </div>
    </div>
  </b-form>

  <b-table :per-page="perPage" :current-page="currentPage" striped hover :items="placesProvider" :busy.sync="loading" ref="placesTable" :fields="fields">
    <template slot="enabled" slot-scope="data">
      <b-form-checkbox
                     :checked="data.item.enabled"
                     @change="toggleEnabled(data.item)" />
    </template>
    <template slot="actions" slot-scope="data">
      <b-button @click="deletePlace(data.item)" variant="danger">Delete</b-button>
    </template>
  </b-table>
  <b-row>
    <b-col md="6" class="my-1">
      <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage" class="my-0" />
    </b-col>
  </b-row>
</b-container>
</template>

<script>
import Place from '@/models/Place';
import { ValidationError } from '@/camo/lib/errors';
import _ from 'lodash';

export default {
  name: 'landing-page',
  data() {
    return {url:'',
      loading: false,
      currentPage: 1,
      perPage: 5,
      totalRows: 0,
      fields: [
        'url',
        'enabled',
        { key: 'actions', label: 'Actions' },
      ],
      form: {
        errors: [],
        url: '',
      }
    };
  },
  computed: {
    urlError() {
      return _.get(_.find(this.form.errors, {field:'url'}), 'message', null);
    }
  },
  methods: {
    create() {
      this.form.errors=[];
      let place = Place.create({
        url: this.form.url,
      });
      place.save().then((i)=> {
        this.form.errors=[];
        this.form.url='';
        this.$refs.placesTable.refresh();
      }).catch((err)=>{
        if(_.get(err,'className') === 'ValidationError') {
          this.form.errors.push({field: err.field, message: err.message});
        }
        if(err.message.indexOf('unique constraint')!==-1) {
          this.form.errors.push({field: 'url', message: 'Url already exists'});
        }
      });
      return false;
    },
    deletePlace(item) {
      item.delete().then(()=>{
        this.$refs.placesTable.refresh();
      });
    },
    toggleEnabled(item) {
      item.enabled = !item.enabled;
      item.save().then(()=>{
        //this.$refs.placesTable.refresh();
      });
    },
    async placesProvider (ctx) {
      this.loading=true;
      let result = Place.find({}, {
        sort: '-createdAt',
        limit:ctx.perPage,
        skip:(ctx.currentPage-1)*ctx.perPage,
      });
      const totalRows = await Place.count();
      result = await result;
      this.totalRows=totalRows;
      this.loading=false;
      return result;
    }
  }
}
</script>

<style>
</style>
