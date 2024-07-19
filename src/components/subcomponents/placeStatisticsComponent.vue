<template>
  <div id="chartWrapper">
    <button class="mapButton" v-b-toggle.collapse-1><b-icon-bar-chart-line-fill variant="dark"
        title="Show Diagrams" /><b-icon-caret-right-fill variant="dark" class="when-open" /><b-icon-caret-down-fill size
        variant="dark" class="when-collapsed" /></button>
    <b-collapse id="collapse-1">
      <b-card>
        <b-card-text>
          {{ labels.plaStaTitle }}
        </b-card-text>
        <div id="chart-div"></div>
      </b-card>
    </b-collapse>
  </div>
</template>

<script>
import * as d3 from "d3";
import { BIconBarChartLineFill, BIconCaretDownFill,  BIconCaretRightFill } from 'bootstrap-vue';
export default {
  components: {
    BIconBarChartLineFill,
    BIconCaretDownFill,
    BIconCaretRightFill,
  },
  props: ['placeStatistics', 'divID', 'focusObject', 'labels'],
  data() {
    return {

    };
  },
  watch: {
    focusObject: function (newValue) {
      d3.selectAll(".activeChart").remove();
      d3.selectAll(".charts").style("color", "black").style("fill", "black");
      const currentSvg = d3.select(`#chart${newValue}`);
      currentSvg._groups[0][0].scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
      currentSvg.style("color", "green").style("fill", "green");
      // .append("line").attr("class", "activeChart").attr("x1", 0).attr("y1", 30).attr("x2", 0).attr("y2", 180).style("stroke", "green").style("stroke-width", 2);
    },
    placeStatistics: function () {
      d3.selectAll('#chart-div svg').remove();
      this.generatePlaceCharts();
    },
  },
  mounted() {
    this.generatePlaceCharts();
  },
  methods: {
    generatePlaceCharts() {
      // Jedes Jahr aus den Statistiken durchgehen und abrufen, wie viele Briefe 2, 1, 0 Orte haben.
      // Für jedes Jahr barChart generieren oder nur fürs erste? 
      // Y-Achse = Anzahl Briefe
      // X-Achse = Anzahl Orte (2, 1, 0)
      for (let i = 0; i < this.placeStatistics.length; i++) {
        const year = this.placeStatistics[i];
        const margin = { top: 30, right: 20, bottom: 60, left: 50 }; //left: 40
        const width = 180 - margin.left - margin.right;
        const height = 240 - margin.top - margin.bottom;

        const svg = d3.select(`#chart-div`)
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .attr("id", `chart${i}`)
          .attr("class", "charts")
          .append("g")
          .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")")
          .on("click", () => this.$emit("changeYear", year.year))
          .on("mouseover", function () {
            d3.select(this).style("cursor", "pointer").style("opacity", "0.7");
          })
          .on("mouseleave", function () {
            d3.select(this).style("opacity", "1.0")
          });

        const x = d3.scaleBand()
          .range([0, width])
          .domain([this.labels.plaStaNoPlaces, this.labels.plaSta1Place, this.labels.plaSta2Places])
          .padding(0.2);
        svg.append("g")
          .attr("transform", "translate(0," + height + ")")
          .call(d3.axisBottom(x))
          .selectAll("text")
          .attr("transform", "translate(-10,0)rotate(-45)")
          .style("text-anchor", "end");

        svg.append("g").attr("id", "title").append("text").text(year.year).attr("transform", `translate(${width / 2 - 16}, -10)`).style("font-size", "0.8em");
        svg.append("g").attr("id", "y-title").append("text").text(this.labels.plaStaAxisLabelY).attr("transform", `translate(-50, -10)`).style("font-size", "0.6em"); //translate(${-margin.left}, -10)
        svg.append("g").attr("id", "x-title").append("text").text(this.labels.plaStaAxisLabelX).attr("transform", `translate(${width - 17}, ${height + 40})rotate(-45)`).style("font-size", "0.6em");

        const y = d3.scaleLinear()
          .domain([0, d3.max(Object.keys(year.statistics).map(stat => year.statistics[stat].value))])
          .range([height, 0]);
        svg.append("g")
          .call(d3.axisLeft(y));

        svg.selectAll("mybar")
          .data(Object.keys(year.statistics))
          .enter()
          .append("rect")
          .attr("x", (stat) => { return x(year.statistics[stat].label); })
          .attr("y", (stat) => { return y(year.statistics[stat].value); })
          .attr("width", x.bandwidth())
          .attr("height", (stat) => { return height - y(year.statistics[stat].value); })
          .attr("fill", function (stat) {
            switch (year.statistics[stat].label) {
              case "0 Orte":
                return "red";
              case "1 Ort":
                return "gray";
              case "2 Orte":
                return "green";
              default:
                return "red";
            }
          });
      }

      d3.selectAll(".activeChart").remove();
      d3.selectAll(".charts").style("color", "black").style("fill", "black");
      const currentSvg = d3.select(`#chart${0}`);
      currentSvg._groups[0][0].scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      currentSvg.style("color", "green").style("fill", "green");


      // const margin = {top: 30, right: 30, bottom: 70, left: 60};
      // const width = 460 - margin.left - margin.right;
      // const height = 400 - margin.top - margin.bottom;

      // const svg = d3.select(`${this.divID}`)
      //               .append('svg')
      //                 .attr('width', width + margin.left + margin.right)
      //                 .attr("height", height + margin.top + margin.bottom)
      //               .append("g")
      //                 .attr("transform",
      //                       "translate(" + margin.left + "," + margin.top + ")");

      // const x = d3.scaleBand()
      //             .range([ 0, width ])
      //             .domain(["0 Orte", "1 Ort", "2 Orte"]) // Hier soll die Property stehen? Könnte auch hardcoden 0-2
      //             .padding(0.2);
      // svg.append("g")
      //   .attr("transform", "translate(0," + height + ")")
      //   .call(d3.axisBottom(x))
      //   .selectAll("text")
      //     .attr("transform", "translate(-10,0)rotate(-45)")
      //     .style("text-anchor", "end");

      // svg.append("g").append("text").text(this.placeStatistics[27].year).attr("transform", `translate(${width/2 - margin.right}, ${height + margin.bottom - 15})`);

      // const y = d3.scaleLinear()
      //           .domain([0, d3.max(Object.keys(this.placeStatistics[27].statistics).map(stat => this.placeStatistics[27].statistics[stat].value))])
      //           .range([ height, 0]);
      // svg.append("g")
      //    .call(d3.axisLeft(y));

      // svg.selectAll("mybar")
      //     .data(Object.keys(this.placeStatistics[27].statistics))
      //     .enter()
      //     .append("rect")
      //       .attr("x", (stat) => { return x(this.placeStatistics[27].statistics[stat].label); })
      //       .attr("y", (stat) => { return y(this.placeStatistics[27].statistics[stat].value); })
      //       .attr("width", x.bandwidth())
      //       .attr("height", (stat) => { return height - y(this.placeStatistics[27].statistics[stat].value); })
      //       .attr("fill", "#69b3a2");


    },
  },
}
</script>

<style scoped>
.mapButton {
  margin-top: 1px;
  background-color: white;
  border: 2px solid rgba(0, 0, 0, 0.2);
  width: 50px;
  height: 30px;
  border-radius: 5px;
  z-index: 2;
}

.mapButton:hover {
  background-color: #f0f0f0;
}

p {
  font-size: small;
  font-weight: bold;
}

.collapsed {
  background-color: white;
}

.not-collapsed {
  background-color: #555555 !important;
}

.not-collapsed svg {
  fill: white;
}

.collapsed > .when-collapsed,
.not-collapsed > .when-open {
  display: none !important;
}

#collapse-1 {
  margin-top: 2em;
  margin-right: 0.5em;
  position: absolute;
    width: 15vw;
    height: 75vh;
    display: flex;
    top: -33px;
    left: 80vw;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: flex-end;
    /* Added for Vertical alignment */
    background: rgba(255, 255, 255, 0.0);
    z-index: 1;
}

#chart-div {
  position: relative;
  height: 65vh;
  z-index: 2;
  scrollbar-width: thin;
  overflow-y: scroll;
}
</style>