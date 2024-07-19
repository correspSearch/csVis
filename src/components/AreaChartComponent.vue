<template>
  <div class="position-relative d-flex flex-column justify-content-center align-items-center">
    <div id="title" class="d-flex justify-content-center mt-4">
      <h5 v-if="titleName">{{labels.balTitle}}<i>{{ titleName }}</i></h5>
      <h5 v-else-if="rootName">{{ labels.balTitle}}<i>{{ rootName }}</i></h5>
      <h5 v-else-if="areaChartData.children && areaChartData.children.length > 2">{{labels.balTitle}}{{
        areaChartData.children[0].name }} {{labels.balTitleTo}} {{ (areaChartData.children[areaChartData.children.length
        - 2].name ===
        "O.A.") ? areaChartData.children[areaChartData.children.length - 3].name :
        areaChartData.children[areaChartData.children.length - 2].name }}</h5>
    </div>
    <div id="areaChartContainer">
    </div>
    <div class="buttongroup">
      <b-button-group>
        <b-button :disabled="svgIndex <= 0" id="svgBackButton" @click="loadChart(svgIndex - 1)"
          class="border border-dark" variant="light">
          <</b-button>
            <b-button :disabled="svgIndex >= prevSvg.length-1" id="svgForwardButton" @click="loadChart(svgIndex + 1)"
              class="border border-dark" variant="light">></b-button>
            <b-icon-info-circle id="infoButton" role="button" variant="dark" />
      </b-button-group>
      <b-popover target="infoButton" triggers="click" tabindex="0" placement="right">
        <div class="p-3">
          <h6>{{ labels.balinfoButtonTitle }}</h6>
          <ul>
            <li><b>{{ labels.balInfoButtonWheel1}}</b>{{ labels.balInfoButtonWheel2 }}</li>
            <li><b>{{ labels.balInfoButtonDrag1}}</b>{{ labels.balInfoButtonDrag2}}</li>
            <li><b>{{ labels.balInfoButtonHover1}}</b>{{ labels.balInfoButtonHover2}}
              <br />
            </li>
            <li><b>{{ labels.balInfoButtonClickSeg1 }}</b>{{ labels.balInfoButtonClickSeg2 }}<br /></li>
            <li><b>{{ labels.balInfoButtonClickCorresp1}}</b>{{ labels.balInfoButtonClickCorresp2}}</li>
            <li><b>{{ labels.balInfoButtonClickLink1}}</b>{{ labels.balInfoButtonClickLink2}}</li>
            <li><b>{{ labels.balInfoButtonArrow1}}</b>{{ labels.balInfoButtonArrow2}}
            </li>
          </ul>
        </div>
      </b-popover>
    </div>
    <div id="corresp-info" class="fixed-top">
      <b-nav vertical tabs fill>
        <b-nav-item-dropdown dropright lazy class="liststyle"
          toggle-class="text-wrap d-flex justify-content-between align-items-center" no-caret>
          <template #button-content>
            <div>{{ labels.balSideMenuLabel1}}<br /> {{ senderName }}</div>
            <div><b-icon-caret-right-fill font-scale="1" /></div>
          </template>
          <b-dropdown-item @click="showCorrespondentData(senderName)">{{ labels.balSideMenuLabel2}}
          </b-dropdown-item>
        </b-nav-item-dropdown>
        <b-nav-item-dropdown dropright lazy class="liststyle"
          toggle-class="text-wrap d-flex justify-content-between align-items-center" no-caret>
          <template #button-content>
            <div>{{ labels.balSideMenuLabel3}}<br /> {{ receiverName }}</div>
            <div><b-icon-caret-right-fill font-scale="1" /></div>
          </template>
          <b-dropdown-item @click="showCorrespondentData(receiverName)">{{ labels.balSideMenuLabel2}}</b-dropdown-item>
        </b-nav-item-dropdown>
        <b-nav-item disabled class="liststyle">{{ labels.balSideMenuStats1}}{{ currentDate }}: {{ dateCount
          }}</b-nav-item>
        <b-nav-item disabled class="liststyle">{{ labels.balSideMenuStats2}}{{ letterCount }}</b-nav-item>
        <b-nav-item class="liststyle" :href="csLink" target="_blank">{{ labels.balSideMenuLink }}</b-nav-item>
      </b-nav>
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";
import {BIconCaretRightFill, BIconInfoCircle} from "bootstrap-vue"
export default {
  components: {
    BIconCaretRightFill,
    BIconInfoCircle,
  },
  props: ["data", "labels"],
  data() {
    return {
      prevSvg: [],
      svgIndex: 0,
      rootName: "",
      titleName: "",
      titles: [""],
      senderName: "",
      receiverName: "",
      currentDate: 0,
      dateCount: 0,
      letterCount: "",
      csLink: "",
      holdSelectionObject: {
        holdSelection: false,
        holdSubgroup: "",
        holdSenderName: "",
        holdReceiverName: "",
        holdCsLink: "",
        holdDateCount: 0,
        holdLetterCount: "",
        holdCurrentDate: 0,
      },
      areaChartData: {},
      correspInfo: {},
    };
  },
  mounted() {
    [this.areaChartData, this.correspInfo] = this.adaptJsonToAreaChartData(this.data);
    this.generateAreaChart(this.areaChartData);
  },
  watch: {
    data: function (newValue) {
      [this.areaChartData, this.correspInfo] = this.adaptJsonToAreaChartData(newValue);
      this.generateAreaChart(this.areaChartData);
    },
  },
  methods: {
    adaptJsonToAreaChartData(jsonFile) {
      const areaChartFormat = {};
      const correspInfo = [];
      const params = (window.location.href.split('?')[1]) ? new URLSearchParams(window.location.href.split("?")[1]) : "";
      // areaChartFormat.name = jsonFile.hits.hits[0]._source.names[0].text;
      areaChartFormat.maxCount = Math.max(
        ...jsonFile.aggregations.visualDates.date_histogram.buckets.map(
          (item) => item.doc_count
        )
      );
      areaChartFormat.children = [];
      areaChartFormat.stackGroups = [];
      const uniqueNames = new Set();

      // Get rootName from ref, if one exists
      let rootNameRef = "";

      if (!this.rootName) {
          // const params = new URLSearchParams(window.location.href.split("?")[1]);
          if (params.has("s")) {
            rootNameRef = params.get("s").split(",")[0];
          }
      }
      params.delete("s");
      for (const letter of jsonFile.hits.hits) {
        let date = "";
        let canonical_sender_name = "";
        let canonical_receiver_name = "";
        let canonical_sender_ref = "";
        let canonical_receiver_ref = "";
        if (letter._source.dates) {
          date = letter._source.dates[0].start.split("-")[0];
          if (!date) {
            console.error("No Date found!");
          }
        } else {
          date = "O.A.";
        }
        if (letter._source.names) {
          const sender = letter._source.names.find(
            (name) => name.action === "sent"
          );
          const receiver = letter._source.names.find(
            (name) =>
              name.action === "received"
          );
          if (sender && receiver) {
            canonical_sender_name = (sender.canonical_name) ? sender.canonical_name : "No Name";
            canonical_sender_ref = (sender.canonical_ref) ? sender.canonical_ref : "No Ref";

            canonical_receiver_name = (receiver.canonical_name) ? receiver.canonical_name : "No Name";
            canonical_receiver_ref = (receiver.canonical_ref) ? receiver.canonical_ref : "No Ref";

          } else if (sender && !receiver) {
            canonical_sender_name = (sender.canonical_name) ? sender.canonical_name : "No Name";
            canonical_sender_ref = (sender.canonical_ref) ? sender.canonical_ref : "No Ref";

            canonical_receiver_name = "No Name";
            canonical_receiver_ref = "No Ref";
          } else if (!sender && receiver) {
            canonical_sender_name = "No Name";
            canonical_sender_ref = "No Ref";

            canonical_receiver_name = (receiver.canonical_name) ? receiver.canonical_name : "No Name";
            canonical_receiver_ref = (receiver.canonical_ref) ? receiver.canonical_ref : "No Ref";
          }
          // Check if rootNameRef matches canonical_sender_ref or canonical_receiver_ref, if true, get the corresponding name
          if (rootNameRef && !this.rootName) {
            if (rootNameRef === canonical_sender_ref) {
              this.rootName = canonical_sender_name;
            } else if (rootNameRef === canonical_receiver_ref) {
              this.rootName = canonical_receiver_name;
            }
          }
        }
        let correspondence = `${canonical_sender_name}_${canonical_receiver_name}`.replace(/\s+/g, "");
        const existingCorrespondence = correspInfo.find(element => (element.name.includes(canonical_sender_name.replace(/\s+/g, "")) && element.name.includes(canonical_receiver_name.replace(/\s+/g, ""))));
        if (!existingCorrespondence) {
          correspInfo.push({
            name: correspondence,
            correspondent1: canonical_sender_name,
            correspondent2: canonical_receiver_name,
            [`${date}`]: 1,
            count: 1,
            correspLink: `https://correspsearch.net/de/suche.html?s=${(canonical_sender_ref !== "No Ref") ? canonical_sender_ref : ""}${(canonical_receiver_ref !== "No Ref") ? "," + canonical_receiver_ref : ""}${(params.toString() !== "") ? "&" + params : ""}`,
          });
        } else {
          if (!existingCorrespondence[date]) {
            existingCorrespondence[date] = 1;
          } else {
            existingCorrespondence[date] += 1;
          }
          existingCorrespondence.count += 1;
        }

        const fittingDate = areaChartFormat.children.find(
          (element) => element.name === date
        );
        if (!fittingDate) {
          areaChartFormat.children.push({
            name: date,
            [`${(existingCorrespondence) ? existingCorrespondence.name : correspondence}`]: 1,
          });
          (existingCorrespondence) ? uniqueNames.add(existingCorrespondence.name) : uniqueNames.add(correspondence);
          (existingCorrespondence) ? areaChartFormat.stackGroups.push(existingCorrespondence.name) : areaChartFormat.stackGroups.push(correspondence);
        } else {
          if (!fittingDate[correspondence]) {
            let foundCorrespondence = false;
            // could be that sender and receiver have a correspondence, but in switched roles, so we check for that
            for (const propertyName of Object.keys(fittingDate)) {
              if (propertyName.includes(canonical_sender_name.replace(/\s+/g, "")) && propertyName.includes(canonical_receiver_name.replace(/\s+/g, ""))) {
                fittingDate[propertyName] += 1;
                foundCorrespondence = true;
              }
            }
            if (!foundCorrespondence) {
              if (existingCorrespondence) {
                fittingDate[existingCorrespondence.name] = 1;
              } else {
                fittingDate[correspondence] = 1;
                uniqueNames.add(correspondence);
                areaChartFormat.stackGroups.push(correspondence);
              }
            }
          } else {
            fittingDate[correspondence] += 1;
          }
        }
      }
      areaChartFormat.children.push({ labelsForBars: uniqueNames });
      // this.areaChartData = areaChartFormat;
      // this.correspInfo = correspInfo;

      return [areaChartFormat, correspInfo];
    },
    selectCorrespondentData(correspondent) {
      const areaChartFormat = {};

      areaChartFormat.name = correspondent;
      areaChartFormat.maxCount = 0; // Muss ausgerechnet werden

      areaChartFormat.children = [];
      const uniqueNames = new Set();

      const filteredArray = this.areaChartData.children.map(year => {
        const filteredYear = Object.entries(year).filter((key) => {
          if (key[0].includes(correspondent.replace(/\s+/g, "")) || key[0] === "name") {
            if (key[0] !== "name") uniqueNames.add(key[0]);
            return key;
          }
        });
        if (filteredYear.length > 1) {
          const yearCount = filteredYear.filter(element => element[0] !== "name").reduce((accumulator, currentValue) => accumulator + currentValue[1],0);
          if (areaChartFormat.maxCount < yearCount) areaChartFormat.maxCount = yearCount;
          return Object.fromEntries(filteredYear);
        }
      });

      const correspData = filteredArray.filter(element => element !== undefined);
      areaChartFormat.children = correspData;
      areaChartFormat.children.push({labelsForBars: uniqueNames});
      return areaChartFormat;
    },
    generateAreaChart(data) {
      const vue = this;

      if (d3.select("#svgChart")) {
        d3.select("#svgChart").remove();
      }
      const subgroups = data.children.find((element) =>
        Object.hasOwn(element, "labelsForBars")
      );
      const groups = data.children.map((d) => d.name).filter((d) => d !== undefined);

      const margin = { top: 30, right: 50, bottom: 30, left: 50 },
        width = (groups.length < 7 ) ? 500 - margin.left - margin.right : window.innerWidth - margin.left - margin.right,
        height = window.innerHeight - 170 - margin.top - margin.bottom;

      const svg = d3
        .select("#areaChartContainer")
        .on("click", function (event, d) {
          if (event.target.tagName !== "rect") {
            vue.holdSelectionObject.holdSelection = false;
            vue.senderName = "";
            vue.receiverName = "";
            vue.letterCount = "";
            vue.csLink = "";
            vue.currentDate = 0;
            vue.dateCount = 0;
            d3.selectAll(".myRect").style("opacity", 1);
            d3.select("#corresp-info").style("opacity", 0);
          } else {
            vue.holdSelectionObject.holdSelection = true;
          }
        })
        .append("svg")
        .attr("id", "svgChart")
        .call(d3.zoom().on("zoom", function (event) {
        svg.attr("transform", event.transform)
      }))
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Add X axis
      const x = d3.scaleBand().domain(groups).range([0, width]).padding([0.2]);
      svg
        .append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll("text")
        .attr("transform", function () {
          if (groups.length > 60) {
            return "translate(-10, 10)rotate(-45)";
          }
        });

      // Add Y axis
      const y = d3.scaleLinear().domain([0, data.maxCount]).range([height, 0]);
      svg.append("g").call(d3.axisLeft(y));

      const color = d3
        .scaleSequential()
        .domain([0,subgroups.labelsForBars.size])
        .interpolator(d3.interpolateTurbo);

      const stackedData = d3.stack().keys(subgroups.labelsForBars)(
        data.children
      );
      
      // Draw bars
      svg
        .append("g")
        .selectAll("g")
        .data(stackedData)
        .join("g")
        .attr("fill", (d) => { return color(Math.ceil(Math.random() * (stackedData.length - 0) + 0));})
        .attr("class", (d) => "myRect " + "group" + d.index)
        .selectAll("rect")
        .data(function (d) { const filteredD = d.filter(element => !isNaN(element[1])); return filteredD;})
        .join("rect")
        .attr("x", (d) => x(d.data.name))
        .attr("y", (d) => y(d[1]))
        .attr("height", (d) => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        // .attr("stroke", "grey")
        .on("click", function (event, d) {
          const subGroupName =
            "group" + d3.select(this.parentNode).datum().index;

          vue.holdSelectionObject.holdSubgroup = subGroupName;
          d3.selectAll(".myRect").style("opacity", 0.2);
          d3.selectAll("." + subGroupName).style("opacity", 1);

          const subgroupName = d3.select(this.parentNode).datum().key;
          const correspNames = subgroupName.split("_");
          const correspondence = vue.correspInfo.find(element => (element.name.includes(correspNames[0]) && element.name.includes(correspNames[1])));

          vue.holdSelectionObject.holdSenderName = correspondence.correspondent1;
          vue.holdSelectionObject.holdReceiverName = correspondence.correspondent2;
          vue.holdSelectionObject.holdCurrentDate = d.data.name;
          vue.holdSelectionObject.holdDateCount = correspondence[d.data.name];
          vue.holdSelectionObject.holdLetterCount = correspondence.count;
          vue.holdSelectionObject.holdCsLink = correspondence.correspLink;


        })
        .on("mouseover", function (event, d) {
          const subGroupName =
            "group" + d3.select(this.parentNode).datum().index;

          d3.selectAll(".myRect").style("opacity", 0.2);

          d3.selectAll("." + subGroupName).style("opacity", 1);

          const subgroupName = d3.select(this.parentNode).datum().key;
          const subgroupValue = d.data[subgroupName];
          const correspNames = subgroupName.split("_");
          const correspondence = vue.correspInfo.find(element => (element.name.includes(correspNames[0]) && element.name.includes(correspNames[1])));
          vue.senderName = correspondence.correspondent1;
          vue.receiverName = correspondence.correspondent2;
          vue.currentDate = d.data.name;
          vue.dateCount = correspondence[d.data.name];
          vue.letterCount = correspondence.count;
          vue.csLink = correspondence.correspLink;
          d3.select("#corresp-info").style("opacity", 1);
        })
        .on("mouseleave", function (event, d) {
          if (vue.holdSelectionObject.holdSelection) {
            vue.senderName = vue.holdSelectionObject.holdSenderName;
            vue.receiverName = vue.holdSelectionObject.holdReceiverName;
            vue.letterCount = vue.holdSelectionObject.holdLetterCount;
            vue.csLink = vue.holdSelectionObject.holdCsLink;
            vue.currentDate = vue.holdSelectionObject.holdCurrentDate;
            vue.dateCount = vue.holdSelectionObject.holdDateCount;

            d3.selectAll(".myRect").style("opacity", 0.2);
            
            d3.selectAll("." + vue.holdSelectionObject.holdSubgroup).style("opacity", 1);
          } else {
          vue.senderName = "";
          vue.receiverName = "";
          vue.letterCount = "";
          vue.csLink = "";
          vue.currentDate = 0;
          vue.dateCount = 0;
          d3.select("#corresp-info").style("opacity", 0);
          // tooltip.style("opacity", 0);
          d3.selectAll(".myRect").style("opacity", 1);
          }
        });
      if (vue.prevSvg.length < 10) {
        // vue.prevSvg.push(d3.select("#svgChart")._groups[0][0]);
        vue.prevSvg[vue.svgIndex] = d3.select("#svgChart")._groups[0][0];
      } else {
        vue.prevSvg[10] = d3.select("#svgChart")._groups[0][0];
      }
      svg.append("g").attr("id", "y-title").append("text").text(this.labels.balAxisLabelY).attr("transform", `translate(-30, -10)`).style("font-size", "0.8em").style("font-weight", "bold");
      svg.append("g").attr("id", "x-title").append("text").text(this.labels.balAxisLabelX).attr("transform", `translate(${width + 10}, ${height + 19})rotate(-45)`).style("font-size", "0.8em").style("font-weight", "bold");
    },
    showCorrespondentData(correspondent) {
      this.titleName = correspondent;
      this.titles.push(correspondent);
      const correspondentData = this.selectCorrespondentData(correspondent);
      this.svgIndex += 1;
      this.holdSelectionObject.holdSelection = false;
      this.senderName = "";
      this.receiverName = "";
      this.letterCount = "";
      this.csLink = "";
      this.currentDate = 0;
      this.dateCount = 0;
      d3.selectAll(".myRect").style("opacity", 1);
      d3.select("#corresp-info").style("opacity", 0);
      this.generateAreaChart(correspondentData);
    },
    loadChart(index) {
      const vue = this;
      vue.svgIndex = index;
      if (vue.prevSvg) {
        vue.holdSelectionObject.holdSelection = false;
        vue.senderName = "";
        vue.receiverName = "";
        vue.letterCount = "";
        vue.csLink = "";
        vue.currentDate = 0;
        vue.dateCount = 0;
        d3.selectAll(".myRect").style("opacity", 1);
        d3.select("#corresp-info").style("opacity", 0);
        d3.select("#svgChart").remove();
        d3.select("#areaChartContainer").select(function() {
          return this.appendChild(vue.prevSvg[index]);
        });
        vue.titleName = vue.titles[index];
      }
    }
  },
};
</script>

<style scoped>
rect > text {
  font-size: 12px;
  color: black;
  fill: rgb(0, 0, 0);
  z-index: -1;
}

#areaChartContainer {
  display: flex;
  width: 100%;
  justify-content: center;
}

#title {
  background-color: rgba(255, 255, 255, 0);
  width: fit-content;
}

#corresp-info {
  position: absolute;
  margin-top: 70px;
  left: 15px;
  width: 200px;
  font-size: small;
  opacity: 0;
  background-color: white;
  border: solid darkgray 1px;
  border-radius: 5px;
}

#svgBackButton:disabled,
#svgForwardButton:disabled {
  opacity: 0.3;
}

#infoButton {
  width: 25px;
  height: 25px;
  margin-top: 7px;
  margin-left: 7px;
}

#infoButton:hover {
  fill: #007bff;
}

.buttongroup {
  width: fit-content;
  position: absolute;
  top: 10px;
  left: 15px;
}

.liststyle {
  border-bottom: solid darkgray 1px;
  width: 100%;
}

/* .liststyle:hover {
  border: solid gray 0.5px;
} */
</style>
