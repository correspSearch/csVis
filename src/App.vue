<template>
  <div>
    <b-card title="test" no-body>
      <b-card-header header-tag="nav">
        <b-nav card-header tabs align="center" variant="secondary">
          <b-navbar-brand>{{labels.navbarBrand}}</b-navbar-brand>
          <b-nav-item :active="bal" variant="secondary" @click="loadViz('bal')">{{ labels.navbarBal}}</b-nav-item>
          <b-nav-item :active="kar" variant="secondary" @click="loadViz('kar')">{{ labels.navbarKar}}</b-nav-item>
          <b-nav-item :active="net" variant="secondary" @click="loadViz('net')">{{ labels.navbarNet}}</b-nav-item>
          <b-nav-item :active="inf" variant="secondary" @click="loadViz('inf')">{{ labels.navbarInf}}</b-nav-item>
        </b-nav>
      </b-card-header>
      <StartComponent v-if="inf" :labels="labels"/>
      <AreaChartComponent v-if="bal" :data="dataset" :labels="labels" />
      <LeafletConnectionComponent v-if="kar" :data="dataset" :labels="labels"/>
      <ForceDirectedGraphComponent v-if="net" :data="dataset" :labels="labels"/>
    </b-card>
    <div v-if="loading" id="loading-div" class="d-flex justify-content-center align-items-center text-center">
      <b-spinner variant="primary" label="Text Centered" class="m-2"></b-spinner>
      <div>{{ labels.loading }}</div>
    </div>
  </div>
</template>

<script>
import StartComponent from "./components/StartComponent.vue";
import AreaChartComponent from "./components/AreaChartComponent.vue";
import LeafletConnectionComponent from "./components/LeafletConnectionComponent.vue";
import ForceDirectedGraphComponent from "./components/ForceDirectedGraphComponent.vue";
import allLabels from "./resources/labels.js";
export default {
  components: {
    StartComponent,
    AreaChartComponent,
    LeafletConnectionComponent,
    ForceDirectedGraphComponent,
  },
  data() {
    return {
      dataset: null,
      inf: true,
      bal: false,
      kar: false,
      net: false,
      querybuilderApi: "",
      eSearch: "",
      loading: true,
      labels: {},
    }
  },
  created() {
    // Get language for the labels from the prop
    const language = window.location.pathname.match(/\/en\//) ? 'en' : 'de';
    switch (language) {
      case 'en':
        this.labels = allLabels.en;
        break;
      default:
        this.labels = allLabels.de;
        break;
    }
  },
  mounted() {
    this.getQuery();
  },
  methods: {
    loadViz(type) {
      switch (type) {
        case "inf":
          this.inf = true;
          this.net = false;
          this.kar = false;
          this.bal = false;
          break;
        case "bal":
          this.inf = false;
          this.net = false;
          this.kar = false;
          this.bal = true;
          break;
        case "kar":
          this.inf = false;
          this.net = false;
          this.kar = true;
          this.bal = false;
          break;
        case "net":
          this.inf = false;
          this.net = true;
          this.kar = false;
          this.bal = false;
          break;
        default:
          console.log("rerror");
      }
    },
    async getQuery() {
      // get url-params
      if (window.location.search) {
        const currentUrlString = window.location.search;
        const viz = "&vis=1";
        this.loading = true;
        fetch(
          `${this.querybuilderApi}${currentUrlString}${viz}`
        ).then((response) => {
          response.json().then((qy) => {
            const query = qy;
            this.fetchResults(query);
          });
        });
      }
    },
    fetchResults(query) {
      // fetch data from json
      fetch(this.eSearch, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify(query),
        dataType: "json",
        headers: {
          "Content-Type": "application/json",
        },
      }).then((response) => {
        response.json().then((json) => {
          this.dataset = json;
          this.loading = false;
          const params = new URLSearchParams(window.location.search);
          const vistype = Number(params.get("vistype"));
          switch (vistype) {
            case 0:
              this.inf = false;
              this.net = false;
              this.kar = false;
              this.bal = true;
              break;
            case 1:
              this.inf = false;
              this.net = false;
              this.kar = true;
              this.bal = false;
              break;
            case 2:
              this.inf = false;
              this.net = true;
              this.kar = false;
              this.bal = false;
              break;
            default:
              this.inf = true;
              this.net = false;
              this.kar = false;
              this.bal = false;
              break;
          }
        });
      });
    },
  },
};
</script>

<style>
#loading-div {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, .8);
}
</style>
