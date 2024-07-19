<template>
  <div id="forceGraphWrapper" class="d-flex justify-content-between align-items-stretch">
    <b-button-group id="buttonMenu" vertical>
      <b-button id="zoomInButton" class="border border-dark" variant="light"><b-icon-plus /></b-button>
      <b-button id="zoomOutButton" class="border border-dark" variant="light"><b-icon-dash /></b-button>
    </b-button-group>
    <b-icon-info-circle id="infoButtonGraph" role="button" variant="dark" />
    <b-popover target="infoButtonGraph" triggers="click" tabindex="0" placement="right">
      <div class="p-3">
        <h6>{{ labels.netInfoButtonTitle}}</h6>
        <ul>
          <li><b>{{ labels.netInfoButtonWheel1}}</b>{{ labels.netInfoButtonWheel2}}</li>
          <li><b>{{ labels.netInfoButtonDrag1}}</b>{{ labels.netInfoButtonDrag2}}</li>
          <li><b>{{ labels.netInfoButtonHover1}}</b>{{ labels.netInfoButtonHover2}}<br /></li>
          <li><b>{{ labels.netInfoButtonHover1}}</b>{{ labels.netInfoButtonHover3}}<br /></li>
          <li><b>{{ labels.netInfoButtonClick1}}</b>{{ labels.netInfoButtonClick2}}<br />
          </li>
          <li><b>{{ labels.netInfoButtonClick1}}</b>{{ labels.netInfoButtonClick3 }}</li>
          <li><b>{{ labels.netInfoButtonClick1}}</b>{{ labels.netInfoButtonClick4 }}</li>
        </ul>
      </div>
    </b-popover>
    <div id="tooltip"></div>
    <div id="color-legend">
      <p>{{ labels.netLegendLabelTitle }}</p>
      <table>
        <tr>
          <td><i style="background: #1f77b4"></i></td>
          <td><span>{{ labels.netLegendLabelMale }}</span></td>
        </tr>
        <tr>
          <td><i style="background: #2ca02c"></i></td>
          <td><span>{{ labels.netLegendLabelFemale }}</span></td>
        </tr>
        <tr>
          <td>
            <i style="background: #ff7f0e"></i>
          </td>
          <td>
            <span>{{ labels.netLegendLabelUnknown }}</span>
          </td>
        </tr>
      </table>
    </div>
    <div id="ForceGraphContainer">
    </div>
    <div id="correspondentList">
      <b-card v-if="holdSelection && correspondents.length > 0">
        <template #header>
          <div class="d-flex justify-content-between align-items-center">
            <h5 style="color: green">{{headString}}</h5>
            <b-button-group v-if="headCorresp.link" class="mr-3">
              <b-button v-b-tooltip.hover :title="envelopeHoverText" size="sm" variant="link" class="m-0 p-0"
                tabindex="0" :href="headCorresp.link" target="_blank"><b-icon-envelope /><span
                  class="position-absolute bg-primary badge rounded-circle notification">{{ totalCount
                  }}</span></b-button>
            </b-button-group>
          </div>
        </template>
        <b-list-group flush>
          <label><b>{{ labels.netCorrespListTitle}}</b></label>
          <b-list-group-item v-for="(correspondent, index) in correspondents" :key="correspondent.name"
            v-on:mouseover="highlightListLinkNode(correspondent, true)"
            v-on:mouseleave="highlightListLinkNode(correspondent, false)">
            <div class="d-flex justify-content-between align-items-center ml-1">
              {{correspondent.name}} <!--{{ (!headString.includes("Briefe:")) ? `(${correspondent.value})` : `` }}-->
              <b-button-group class="d-flex align-items-center">
                <b-button v-b-tooltip.hover :title="bullseyeHoverText" size="sm" variant="link" class="m-0 p-1"
                  tabindex="0" v-on:click="highlightListNode(correspondent)"><b-icon-bullseye
                    font-scale="1" /></b-button>
                <b-button v-b-tooltip.hover :title="envelopeHoverText" size="sm" variant="link" class="m-0 p-0"
                  tabindex="0" :href="correspondent.link" target="_blank"><b-icon-envelope /><span
                    class="position-absolute bg-primary badge rounded-circle notification">{{ correspondent.value
                    }}</span></b-button>
              </b-button-group>
            </div>
          </b-list-group-item>
        </b-list-group>
      </b-card>
      <div class="d-flex flex-column justify-content-center align-items-center w-100 h-100 p-3" v-else>
        <h4 v-if="rootName">{{ labels.netCorrespRootTitle}}{{ rootName }}</h4>
        <h4 v-else-if="correspData.nodes">{{ labels.netCorrespRootTitle}}{{ correspData.nodes.length
          }}{{ labels.netCorrespRootTitleAlt}}</h4>
        <p><br /><br /><br />{{ labels.netCorrespListText }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";
import { BIconNodePlus, BIconSearch, BIconEnvelope, BIconBullseye, BIconPlus, BIconDash } from 'bootstrap-vue';
export default {
  components: {
    BIconNodePlus,
    BIconSearch,
    BIconBullseye,
    BIconEnvelope,
    BIconPlus,
    BIconDash
  },
  props: ["data", "labels"],
  data() {
    return {
      rootName: "",
      currentYear: 0,
      correspData: {},
      holdSelection: false,
      highlightSelection: false,
      correspondents: [],
      headString: "",
      headCorresp: {},
      totalCount: 0,
      linkSelection: [],
      nodeSelection: [],
      envelopeHoverText: (window.location.pathname.match(/\/en\//)) ? "Lookup in correspsearch" : "In correspsearch suchen",
      bullseyeHoverText: (window.location.pathname.match(/\/en\//)) ? "Set as root node" : "Als neuen Wurzelknoten setzen",
    };
  },
  mounted() {
    // adapt json-Data to the needed Graph-Format
    this.correspData = this.adaptJsonToForceGraphData(this.data);
    // initialize the force graph
    this.generateForceGraph(this.correspData);
  },
  watch: {
    data: function (newValue) {
      d3.select("#ForceGraphContainer svg").remove();
      this.correspData = this.adaptJsonToForceGraphData(newValue);
      this.generateForceGraph(this.correspData);
      this.$forceUpdate();
    },
  },
  methods: {
    /**
     * @method adaptJsonToForceGraphData takes a json-Object from a csSearch-Request, extracts all the data it needs and 
     * divides it into nodes and links, which is needed for the ForceGraph
     * @returns an Object that contains all the correspondents and their relations to each other. A node represents a correspondent and 
     * a link represents a relation between two correspondents.
     */
    adaptJsonToForceGraphData(jsonFile) {
      const treeFormat = {};
      treeFormat.nodes = [];
      treeFormat.links = [];

      // Get rootName from ref, if one exists
      let rootNameRef = "";

      if (!this.rootName) {
        if (window.location.href.split('?')[1]) {
          const params = new URLSearchParams(window.location.href.split("?")[1]);
          if (params.has("s")) {
            rootNameRef = params.get("s").split(",")[0];
          }
        }
      }
      for (const letter of jsonFile.hits.hits) {
        // Not yet needed
        let date = "";
        let receivedPlaceName = "";
        let sentPlaceName = "";
        let receiverName = "";
        let senderName = "";
        let canonical_ref_place_sender = "";
        let canonical_ref_place_receiver = "";
        let senderOccupations = [];
        let receiverOccupations = [];

        let canonical_sender_name = "";
        let sender_birth = "";
        let sender_death = "";
        let canonical_sender_ref = "";
        let canonical_receiver_name = "";
        let receiver_birth = "";
        let receiver_death = "";
        let canonical_receiver_ref = "";
        let receiverGender = "";
        let senderGender = "";
        // Check if the correspondents of a letter exist
        if (letter._source.names) {
          const sender = letter._source.names.find(
            (name) => name.action === "sent"
          );
          const receiver = letter._source.names.find(
            (name) => name.action === "received"
          );
          // Only if both sender and receiver exist, the data is being extracted
          if (sender && receiver) {
            canonical_sender_name = (sender.canonical_name) ? sender.canonical_name : "No Name";
            canonical_sender_ref = (sender.canonical_ref) ? sender.canonical_ref.trim() : "";
            sender_birth = (sender.birth_date) ? sender.birth_date : this.labels.netTooltipLabelDate;
            sender_death = (sender.death_date) ? sender.death_date : this.labels.netTooltipLabelDate;;
            senderGender = (sender.gender) ? sender.gender : this.labels.netLegendLabelUnknown;

            canonical_receiver_name = (receiver.canonical_name) ? receiver.canonical_name : "No Name";
            canonical_receiver_ref = (receiver.canonical_ref) ? receiver.canonical_ref.trim() : "";
            receiver_birth = (receiver.birth_date) ? receiver.birth_date : this.labels.netTooltipLabelDate;;
            receiver_death = (receiver.death_date) ? receiver.death_date : this.labels.netTooltipLabelDate;;
            receiverGender = (receiver.gender) ? receiver.gender : this.labels.netLegendLabelUnknown;
            

            // Check if rootNameRef matches canonical_sender_ref or canonical_receiver_ref, if true, get the corresponding name
            if (rootNameRef && !this.rootName) {
              if (rootNameRef === canonical_sender_ref) {
                this.rootName = canonical_sender_name;
              } else if (rootNameRef === canonical_receiver_ref) {
                this.rootName = canonical_receiver_name;
              }
            }
          }
          if (!canonical_sender_name.includes("Unbekannt") && 
              !canonical_sender_name.includes("Nicht ermittelt") && 
              !canonical_sender_name.includes("No Name") && 
              canonical_sender_name !== "" &&
              !canonical_receiver_name.includes("Unbekannt") && 
              !canonical_receiver_name.includes("Nicht ermittelt") &&
              !canonical_receiver_name.includes("No Name") && 
              canonical_receiver_name !== "") {
          // Check if the correspondents already exist
          const existingSenderID = treeFormat.nodes.find((element) => element.id === canonical_sender_name);
          const existingReceiverID = treeFormat.nodes.find((element) => element.id === canonical_receiver_name);
          // If not, group color based on gender and add them
          if (!existingSenderID) {
            let group;
            switch (senderGender) {
              case "male":
                group = 1;
                break;
              case "female":
                group = 2;
                break;
              case "unknown":
                group = 3;
                break;
              default:
                group = 3;
            }
            treeFormat.nodes.push({
              id: canonical_sender_name,
              group: group,
              properties: {
                name: canonical_sender_name,
                birth: sender_birth,
                death: sender_death,
                gender: senderGender,
                ref: canonical_sender_ref,
              }
            });
          }
          if (!existingReceiverID) {
            let group;
            switch (receiverGender) {
              case "male":
                group = 1;
                break;
              case "female":
                group = 2;
                break;
              case "unknown":
                group = 3;
                break;
              default:
                group = 3;
            }
            treeFormat.nodes.push({
              id: canonical_receiver_name,
              group: group,
              properties: {
                name: canonical_receiver_name,
                birth: receiver_birth,
                death: receiver_death,
                gender: receiverGender,
                ref: canonical_receiver_ref,
              }
            });
          }
          // Check if link between the correspondents already exists
          const existingLink = treeFormat.links.find((link) => (canonical_sender_name === link.source || canonical_sender_name === link.target ) && (canonical_receiver_name === link.target || canonical_receiver_name === link.source));
          // If true, raise the value, which will make the links thicker, else add the linkdata
          if (existingLink) {
            existingLink.value += 1;
          } else {
            const params = (window.location.href.split('?')[1]) ? new URLSearchParams(window.location.href.split("?")[1]) : "";
            params.delete("s");
            treeFormat.links.push({
              source: canonical_sender_name,
              target: canonical_receiver_name,
              link: `https://correspsearch.net/de/suche.html?s=${canonical_sender_ref}${(canonical_receiver_ref) ? ',' + canonical_receiver_ref : canonical_receiver_ref}${(params.toString() !== "") ? "&" + params : ""}`,
              value: 1,
            });
          }
        }
        }
      }
      return treeFormat;
    },
    generateForceGraph(data) {

      const width = window.innerWidth;
      const height = window.outerHeight - 80;
      
      const zoom = d3.zoom()
        .scaleExtent([0.1, 8])
        .on("zoom", zoomed);

      const svg = d3.select("#ForceGraphContainer").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width * 2, height * 2])
        .attr("style", "max-width: 100%; height: auto;")
        .on("click", (event, d) => this.clickSelection(d, event, true));

      d3.select("#correspondentList").attr("height", height);

      const color = d3.scaleOrdinal(d3.schemeCategory10);

      const links = data.links.map(d => ({ ...d }));
      const nodes = data.nodes.map(d => ({ ...d }));

      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", ticked);
      
      const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 1)
        .selectAll()
        .data(links)
        .join("line")
        .attr("stroke-width", d => Math.sqrt(d.value))
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => this.hoverSelection(d, event, true))
        .on("mouseleave", (event, d) => this.hoverSelection(d, event, false))
      // .on("click", (event, d) => this.clickSelection(d, event, true));

      const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll()
        .data(nodes)
        .join("circle")
        .attr("r", 5)
        .attr("fill", d => color(d.group))
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => this.hoverSelection(d, event, true))
        .on("mouseleave", (event, d) => this.hoverSelection(d, event, false))
      // .on("click", (event, d) => this.clickSelection(d, event, true));

      node.append("title")
        .text(d => d.id);

      svg.call(zoom)
        .call(zoom.transform, d3.zoomIdentity.translate(-380, -200).scale(1.5));

      d3.select('#zoomInButton').on("click", zoomIn);
      d3.select('#zoomOutButton').on("click", zoomOut);

      // Set the position attributes of links and nodes each time the simulation ticks.
      function ticked() {

        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
      }

      function zoomed(event) {
        const { transform } = event;
        node.attr("transform", transform);
        node.attr("stroke-width", 1 / transform.k);
        link.attr("transform", transform);
        link.attr("stroke-width", 1 / transform.k);
      }

      function zoomIn() {
        zoom.scaleBy(svg, 1.5);
      }

      function zoomOut() {
        zoom.scaleBy(svg, 0.8);
      }
    },
    hoverSelection(d = null, event = null, hover) {
      this.highlightSelection = hover;
      if (!this.holdSelection) {
        if (this.highlightSelection) {
          if (event.target.nodeName === "circle") {
            this.highlightNodeSelection(true, d);
            this.showTooltip(true, event.target.nodeName, d);
          } else if (event.target.nodeName === "line") {
            this.highlightLinkSelection(true, event.target, d);
            this.showTooltip(true, event.target.nodeName, d);
          }
        } else {
          this.highlightNodeSelection(false);
          this.highlightLinkSelection(false);
          this.showTooltip(false);
        }
      } else {
        // Der Tooltip muss trotzdem geupdated werden
        if (this.highlightSelection) {
          this.showTooltip(true, event.target.nodeName, d);
        } else {
          this.showTooltip(false);
        }
      }
    },
    clickSelection(d = null, event = null, clicked) {
      if (clicked && event.target.nodeName === 'svg') {
        this.holdSelection = false;
        this.highlightNodeSelection(false);
        this.highlightLinkSelection(false);
      } else if (clicked && event.target.nodeName === 'circle' || event.target.nodeName === 'line') {
        this.holdSelection = true;
        this.highlightNodeSelection(false);
        this.highlightLinkSelection(false);
        (event.target.nodeName === 'circle') ? this.highlightNodeSelection(true, event.target.__data__) : this.highlightLinkSelection(true, event.target, event.target.__data__);
      }
      // else if (clicked) {
      //   this.holdSelection = !this.holdSelection;
      //   if (!this.holdSelection && !this.highlightSelection) {
      //     this.highlightNodeSelection(false);
      //     this.highlightLinkSelection(false);
      //   }
      // }
    },
    highlightLinkSelection(highlight, linkElement, linkData) {
      const vm = this;
      if (highlight) {
        const link = d3.select(linkElement);
        const nodes = d3.selectAll("circle").filter(function (data) {
          if ((data.x === linkData.source.x && data.y === linkData.source.y) || (data.x === linkData.target.x && data.y === linkData.target.y)) {
            return this;
          }
        });
        let SenderProperties = { ...linkData.source.properties };
        SenderProperties.link = linkData.link;
        SenderProperties.value = linkData.value;
        vm.correspondents.push(SenderProperties);
        let ReceiverProperties = { ...linkData.target.properties };
        ReceiverProperties.link = linkData.link;
        ReceiverProperties.value = linkData.value;
        vm.correspondents.push(ReceiverProperties);

        vm.linkSelection = link;
        vm.nodeSelection = nodes;
        d3.selectAll("line").style("opacity", 0.3);
        d3.selectAll("circle").style("opacity", 0.3);
        link.attr("stroke", "red").style("opacity", 1);;
        nodes.style("opacity", 1);

        vm.headString = `${vm.labels.netHeadString1}${linkData.source.id} ${vm.labels.netHeadString2} ${linkData.target.id} (${vm.labels.netHeadString3} ${linkData.value})`;
        vm.headCorresp = {};
      } else {
        d3.selectAll("line").attr("stroke", "#999");
        d3.selectAll("circle").style("opacity", 1);
      }

    },
    highlightNodeSelection(highlight, nodeData) {
      const vm = this;
      if (highlight) {
        const node_links = d3.selectAll("line").filter(function (data) {
          if ((data.source.x === nodeData.x && data.source.y === nodeData.y) ||
            (data.target.x === nodeData.x && data.target.y === nodeData.y)) {
            return this;
          }
        });

        const params = (window.location.href.split('?')[1]) ? new URLSearchParams(window.location.href.split("?")[1]) : "";
        params.delete("s");
        vm.headString = `${vm.labels.netHeadString4} ${nodeData.properties.name}`;
        vm.headCorresp.name = nodeData.properties.name;
        vm.headCorresp.link = `https://correspsearch.net/de/suche.html?s=${nodeData.properties.ref}${(params.toString() !== "") ? "&" + params : ""}`;

        vm.totalCount = vm.correspData.links.reduce((accumulator, currentValue) => {
          if (currentValue.target === nodeData.properties.name || currentValue.source === nodeData.properties.name) {
            return accumulator + currentValue.value;
          } else {
            return accumulator + 0;
          }
        }, 0);

        const nodes = d3.selectAll("circle").filter(function (data) {
          let sourceLink = node_links._groups[0].find(link => link.__data__.source.id === data.id);
          let targetLink = node_links._groups[0].find(link => link.__data__.target.id === data.id);
          if (sourceLink) {
            let properties = this.__data__.properties;
            properties.link = sourceLink.__data__.link;
            properties.value = sourceLink.__data__.value;
            vm.correspondents.push(properties);
            return this;
          } else if (targetLink) {
            let properties = this.__data__.properties;
            properties.link = targetLink.__data__.link;
            properties.value = targetLink.__data__.value;
            vm.correspondents.push(properties);
            return this;
          }
        });

        // remove root correspondent completely from list and just use listHeader for him
        let positionOfSelectedNode = vm.correspondents.indexOf(nodeData.properties);
        vm.correspondents.splice(positionOfSelectedNode, 1);
        // let corresp0 = vm.correspondents[0];
        // vm.correspondents[0] = vm.correspondents[positionOfSelectedNode];
        // vm.correspondents[positionOfSelectedNode] = corresp0;

        d3.selectAll("circle").style("opacity", 0.3);
        d3.selectAll("line").style("opacity", 0.3);
        node_links.attr("stroke", "red").style("opacity", 1);
        nodes.style("opacity", 1);
        vm.linkSelection = node_links;
        vm.nodeSelection = nodes;
      } else {
        d3.selectAll("line").attr("stroke", "#999");
        d3.selectAll("circle").style("opacity", 1);
        vm.headCorresp = {};
        vm.correspondents = [];
        vm.linkSelection = [];
        vm.nodeSelection = [];
      }
    },
    showTooltip(show, element, data) {
      if (show) {
        if (element === "circle") {
          d3.select("#tooltip").html(
            `<b>${this.labels.netTooltipPerson}</b><br>
            ${this.labels.netTooltipLabelName} ${data.properties.name} <br>
            ${this.labels.netTooltipLabelBirth} ${data.properties.birth} <br>
            ${this.labels.netTooltipLabelDeath} ${data.properties.death} <br>
            ${this.labels.netTooltipLabelGender} ${(data.properties.gender === "male") ? "männl." : (data.properties.gender === "female") ? "weibl." : "unbekannt"}`
          ).style("opacity", 1).style("z-index", 500);

        } else if (element === "line") {
          d3.select("#tooltip").html(
            `<b>${this.labels.netTooltipSender}</b><br>
            ${this.labels.netTooltipLabelName} ${data.source.properties.name} <br>
            ${this.labels.netTooltipLabelBirth} ${data.source.properties.birth} <br>
            ${this.labels.netTooltipLabelDeath} ${data.source.properties.death} <br>
            ${this.labels.netTooltipLabelGender} ${(data.source.properties.gender === "male") ? "männl." : (data.source.properties.gender === "female") ? "weibl." : "unbekannt"} <br><br>
            <b>Empfänger</b><br>
            ${this.labels.netTooltipLabelName} ${data.target.properties.name} <br>
            ${this.labels.netTooltipLabelBirth} ${data.target.properties.birth} <br>
            ${this.labels.netTooltipLabelDeath} ${data.target.properties.death} <br>
            ${this.labels.netTooltipLabelGender} ${(data.target.properties.gender === "male") ? this.labels.netLegendLabelMale : (data.target.properties.gender === "female") ? this.labels.netLegendLabelFemale : this.labels.netLegendLabelUnknown} <br><br>
            <b>${this.labels.netTooltipLabelLetterCount} </b> ${data.value}`
          )
            .style("opacity", 1).style("z-index", 500);
        }
      } else {
        d3.select("#tooltip").style("opacity", 0).style("z-index", -1);
      }
    },
    highlightListLinkNode(listNodeData, highlight) {
      const vm = this;
      if (highlight) {
        if (vm.correspondents.length === 2) {
          const node_link = d3.selectAll("line").filter(function (data) {
            if ((data.source.id === vm.correspondents[0].name && data.target.id === vm.correspondents[1].name) ||
              (data.source.id === vm.correspondents[1].name && data.target.id === vm.correspondents[0].name)) {
              return this;
            }
          });
          const nodes = d3.selectAll("circle").filter((data) => (data.id === vm.correspondents[0].name || data.id === vm.correspondents[1].name));
          d3.selectAll("circle").style("opacity", 0.3);
          d3.selectAll("line").attr("stroke", "#999");
          nodes.style("opacity", 1).style("z-index", -1);
          node_link.attr("stroke", "red").style("opacity", 1).style("z-index", -1);
          const tooltipData = { properties: listNodeData };
          vm.showTooltip(true, "circle", tooltipData);
        } else {
          const rootNode = vm.headCorresp;
          const node_link = d3.selectAll("line").filter(function (data) {
            if ((data.source.id === listNodeData.name || data.target.id === listNodeData.name) &&
              (data.source.id === rootNode.name || data.target.id === rootNode.name)) {
              return this;
            }
          });
          const nodes = d3.selectAll("circle").filter((data) => (data.id === listNodeData.name || data.id === rootNode.name));
          d3.selectAll("circle").style("opacity", 0.3);
          d3.selectAll("line").attr("stroke", "#999");
          nodes.style("opacity", 1).style("z-index", -1);
          node_link.attr("stroke", "red").style("opacity", 1).style("z-index", -1);
          const tooltipData = { properties: listNodeData };
          vm.showTooltip(true, "circle", tooltipData);
        }
      } else {
        d3.selectAll("circle").style("opacity", 0.3);
        d3.selectAll("line").attr("stroke", "#999");
        vm.linkSelection.attr("stroke", "red").style("opacity", 1).style("z-index", -1);
        vm.nodeSelection.style("opacity", 1).style("z-index", -1);
        vm.showTooltip(false);
      }
    },
    highlightListNode(nodeData) {
      const vm = this;
      const newNode = d3.selectAll("circle").filter((data) => (data.id === nodeData.name))._groups[0][0];      

      const node_links = d3.selectAll("line").filter(function (data) {
        if ((data.source.x === newNode.__data__.x && data.source.y === newNode.__data__.y) ||
          (data.target.x === newNode.__data__.x && data.target.y === newNode.__data__.y)) {
          return this;
        }
      });
      vm.highlightListLinkNode(null, false);
      // vm.clickSelection(true);
      vm.headCorresp = {};
      vm.correspondents = [];
      vm.linkSelection = [];
      vm.nodeSelection = [];

      const params = (window.location.href.split('?')[1]) ? new URLSearchParams(window.location.href.split("?")[1]) : "";
      params.delete("s");
      vm.headString = `${vm.labels.netHeadString4} ${nodeData.name}`;
      vm.headCorresp.name = nodeData.name;
      vm.headCorresp.link = `https://correspsearch.net/de/suche.html?s=${nodeData.ref}${(params.toString() !== "") ? "&" + params : ""}`;

      const nodes = d3.selectAll("circle").filter(function (data) {
        let sourceLink = node_links._groups[0].find(link => link.__data__.source.id === data.id);
        let targetLink = node_links._groups[0].find(link => link.__data__.target.id === data.id);
        if (sourceLink) {
          let properties = this.__data__.properties;
          properties.link = sourceLink.__data__.link;
          properties.value = sourceLink.__data__.value;
          vm.correspondents.push(properties);
          return this;
        } else if (targetLink) {
          let properties = this.__data__.properties;
          properties.link = targetLink.__data__.link;
          properties.value = targetLink.__data__.value;
          vm.correspondents.push(properties);
          return this;
        }
      });

      let positionOfSelectedNode = vm.correspondents.indexOf(nodeData);
      vm.correspondents.splice(positionOfSelectedNode, 1);
      //   let corresp0 = vm.correspondents[0];
      //   vm.correspondents[0] = vm.correspondents[positionOfSelectedNode];
      //   vm.correspondents[positionOfSelectedNode] = corresp0;

        d3.selectAll("circle").style("opacity", 0.3);
        d3.selectAll("line").style("opacity", 0.3);
        node_links.attr("stroke", "red").style("opacity", 1);
        nodes.style("opacity", 1);
        vm.linkSelection = node_links;
        vm.nodeSelection = nodes;

      vm.totalCount = vm.correspData.links.reduce((accumulator, currentValue) => {
        if (currentValue.target === nodeData.name || currentValue.source === nodeData.name) {
          return accumulator + currentValue.value;
        } else {
          return accumulator + 0;
        }
      }, 0);
    }
  },
};
</script>

<style scoped>
#tooltip {
  position: absolute;
  top: 100px;
  left: 20px;
  border: lightgray solid 1px;
  border-radius: 10px;
  background-color: white;
  color: black;
  width: 175px;
  height: fit-content;
  padding: 15px;
  opacity: 0;
  pointer-events: none;
}

.notification {
  color: white;
  left: 14px;
  margin-top: -2px;
}

#forceGraphWrapper {
  position: relative;
  height: 100%;
}

#buttonMenu {
  position: absolute;
  z-index: 2;
  top: 12px;
  left: 20px;
}

#infoButtonGraph {
  position: absolute;
  z-index: 2;
  left: 70px;
  top: 7px;
  width: 25px;
  height: 25px;
  margin-top: 7px;
  margin-left: 7px;
}

#infoButtonGraph:hover {
  fill: #007bff;
}

#color-legend {
  position: absolute;
  width: 120px;
  padding: 6px 8px;
    font: 14px/18px Arial, Helvetica, sans-serif;
    background: white;
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
    border-radius: 5px;
  bottom: 50px;
  left: 20px;
}

#color-legend i {
  width: 18px;
    height: 18px;
    float: left;
    margin-right: 8px;
}

#correspondentList {
  max-height: 85vh;
  width: 25%;
  overflow: auto;
  scrollbar-width: thin;
  border-left: solid lightgray 1px;
}
</style>
