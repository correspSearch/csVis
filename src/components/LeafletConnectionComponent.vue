<template>
  <div id="wrapper">
    <b-button-group id="buttonMenu" vertical>
      <button v-b-tooltip.hover :title="karHoverSliderButton" class="menuButton" v-b-toggle.collapse-slider>
        <b-icon-toggle2-off variant="dark" /><b-icon-caret-right-fill class="when-open"
          variant="dark" /><b-icon-caret-down-fill class="when-collapsed" />
      </button>
      <place-statistics v-b-tooltip.hover :title="karHoverStatisticsButton" :placeStatistics="placeStatistics"
        :divID="`#barChartContainer`" :focusObject="focusDiagram" @changeYear="changeYear" :labels="labels"></place-statistics>
      <b-dropdown v-b-tooltip.hover :title="karHoverFilterButton" size="sm" id="dropdown-menu" dropright
        class="menuButton" no-caret>
        <template #button-content><b-icon-filter variant="dark" /></template>
        <b-dropdown-item-button :active="filterPlaces === 'onePlace'" button-class="btn-secondary"
          @click="setFilterforPlaces('onePlace')">{{ labels.karSideMenuFilterPlaces1 }}</b-dropdown-item-button>
        <b-dropdown-item-button :active="filterPlaces === 'twoPlaces'" button-class="btn-secondary"
          @click="setFilterforPlaces('twoPlaces')">{{ labels.karSideMenuFilterPlaces2 }}</b-dropdown-item-button>
        <b-dropdown-item-button :active="filterPlaces === 'allPlaces'" button-class="btn-secondary"
          @click="setFilterforPlaces('allPlaces')">{{ labels.karSideMenuFilterPlaces3 }}</b-dropdown-item-button>
      </b-dropdown>
    </b-button-group>
    <b-icon-info-circle id="infoButtonMap" role="button" variant="dark" />
    <b-popover target="infoButtonMap" triggers="click" tabindex="0" placement="right">
      <div class="p-3">
        <h6>{{ labels.karInfoButtonTitle }}</h6>
        <ul>
          <li><b>{{ labels.karInfoButtonWheel1}}</b>{{labels.karInfoButtonWheel2}}</li>
          <li><b>{{ labels.karInfoButtonDrag1}}</b>{{ labels.karInfoButtonDrag2}}</li>
          <li><b>{{ labels.karInfoButtonHover1}}</b>{{ labels.karInfoButtonHover2}}<br />
          </li>
          <li><b>{{ labels.karInfoButtonClickPlace1}}</b>{{ labels.karInfoButtonClickPlace2}}<br /></li>
        </ul>
      </div>
    </b-popover>
    <div id="mapAndSliderContainer">
      <div id="connectionMapContainer"></div>
      <!-- <button class="" id="sliderButton" v-b-toggle.collapse-slider><b-icon-toggle2-off variant="dark"
          title="Show Slider" /><b-icon-caret-right-fill class="when-open" variant="dark" /><b-icon-caret-up-fill
          class="when-collapsed" variant="dark" /></button> -->
      <b-collapse visible id="collapse-slider" @show="udpateWindowWidth()">
        <div class="slidecontainer" style="--step: 1; --min: 0; --max: 100">
          <div class="slider-title">{{labels.karSliderLabel}}</div>
          <div class="range" v-show="correspData.children">
            <input type="range" @input="updateYear($event.target.value)" min="0" max="100" value="0" step="1"
              class="slider" id="myRange" ref="myRange" />
            <ul class="range-labels" id="range-labels">
              <li v-for="(item, index) in correspData.children" :key="index" @click="setSliderValue($event)">
                <span class="label-text">{{ item.name }}</span>
              </li>
            </ul>
          </div>
        </div>
      </b-collapse>
    </div>
    <!-- <div id="barChartContainer">
      <place-statistics :placeStatistics="placeStatistics" :divID="`#barChartContainer`" :focusObject="focusDiagram"
        @changeYear="changeYear"></place-statistics>
    </div> -->
  </div>
</template>

<script>
import L from "leaflet";
import * as d3 from "d3";
import {
  BIconToggle2Off,
  BIconCaretRightFill,
  BIconCaretUpFill,
  BIconCaretLeftFill,
  BIconCaretDownFill,
  BIconFilter,
  BIconInfoCircle,
} from "bootstrap-vue";
import "@elfalem/leaflet-curve";
import "leaflet-arrowheads";
import placeStatistics from "./subcomponents/placeStatisticsComponent.vue";

export default {
  components: {
    placeStatistics,
    BIconToggle2Off,
    BIconCaretRightFill,
    BIconCaretUpFill,
    BIconCaretLeftFill,
    BIconCaretDownFill,
    BIconFilter,
    BIconInfoCircle,
  },
  props: ["data", "labels"],
  data() {
    return {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      zoom: 15,
      center: [51.505, -0.159],
      markerLatLng: [51.504, -0.159],
      correspData: {},
      currentYear: 0,
      geojson: undefined,
      map: {},
      popuptext: [],
      sliderWidth: 0,
      rangeLabels: undefined,
      slider: undefined,
      placeStatistics: [],
      focusDiagram: 0,
      maxCount: 0,
      legend: undefined,
      filterPlaces: "allPlaces",
      karHoverSliderButton: (window.location.pathname.match(/\/en\//)) ? "Show Slider" : "Slider anzeigen",
      karHoverStatisticsButton: (window.location.pathname.match(/\/en\//)) ? "Show Statistics" : "Statistiken anzeigen",
      karHoverFilterButton: (window.location.pathname.match(/\/en\//)) ? "Filter Places" : "Orte filtern",
    };
  },
  created() {
    this.correspData = this.adaptJsonToConnectionMapData(this.data);
  },
  mounted() {
    this.setMaxCount(0);
    this.map = L.map("connectionMapContainer").setView([47, 2], 5);
    this.generateConnectionMap(this.correspData.children[0].children, this.map);
    this.slider = document.getElementById("myRange");
    this.slider.min = 0;
    this.slider.max = this.correspData.children.length - 1;
    this.sliderWidth = this.slider.offsetWidth;
    window.addEventListener("resize", this.udpateWindowWidth);
    const currentLabel = document.querySelector(
      `ul.range-labels li:nth-child(1)`
    );
    currentLabel.classList.add("selected");
    this.udpateWindowWidth();
  },
  beforeUpdate() {
    this.udpateWindowWidth();
  },
  destroyed() {
    window.removeEventListener("resize", this.udpateWindowWidth);
  },
  watch: {
    sliderWidth: function (newWidth) {
      // document.documentElement.style.setProperty(
      //   "--labelWidth",
      //   `${newWidth / (this.correspData.children.length - 1)}`
      // );
      // document.documentElement.style.setProperty(
      //   "--abweichung",
      //   `${(newWidth / (this.correspData.children.length - 1) / 100) * 1.08}`
      // );
      // this.$forceUpdate();
    },
    data: function (newValue) {
      this.correspData = this.adaptJsonToConnectionMapData(newValue);
      this.setMaxCount(0);
      this.generateConnectionMap(
        this.correspData.children[0].children,
        this.map
      );
      this.slider.min = 0;
      this.slider.max = this.correspData.children.length - 1;
      this.sliderWidth = this.slider.offsetWidth;
      this.slider.value = 0;
      this.rangeLabels = document.querySelector("ul.range-labels li.selected");
      this.rangeLabels.classList.remove("selected");
      const currentLabel = document.querySelector(
        `ul.range-labels li:nth-child(1)`
      );
      currentLabel.classList.add("selected");
    },
    // filterPlaces: function (newValue) {
    //   this.generateConnectionMap(
    //     this.correspData.children[this.slider.value].children,
    //     this.map
    //   );
    // },
  },
  methods: {
    showNextYear(count) {
      this.currentYear += count;
      if (this.currentYear > this.correspData.children.length - 2) {
        this.currentYear = 0;
      }
      if (this.currentYear < 0) {
        this.currentYear = this.correspData.children.length - 2;
      }
      this.generateConnectionMap(
        this.correspData.children[this.currentYear].children
      );
    },
    setMaxCount(index) {
      // this. maxCount = d3.max(Object.keys(statistics).map(stat => statistics[stat].value));
      this.maxCount = d3.max(
        this.correspData.children[index].children.map(
          (feature) => feature.properties.length
        )
      );
      // if (statistics.onePlace && statistics.twoPlaces) {
      //   this.maxCount = statistics.onePlace.value + statistics.twoPlaces.value;
      // } else if (statistics.onePlace && !statistics.twoPlaces) {
      //   this.maxCount = statistics.onePlace.value;
      // } else if (!statistics.onePlace && statistics.twoPlaces) {
      //   this.maxCount = statistics.twoPlaces.value;
      // }
    },
    generateConnectionMap(data, map) {
      const vue = this;
      let mapData = [];
      for (const i in map._layers) {
        if (map._layers[i]._path != undefined || map._layers[i]._icon != undefined) {
          try {
            map.removeLayer(map._layers[i]);
          } catch (e) {
          }
        }
      }
      if (vue.filterPlaces === "onePlace") {
        mapData = data
          .map((element) => {
            let filteredProperties = element.properties.filter(
              (property) =>
                property.sentPlace === vue.labels.karLabelUnknownPlace ||
                property.receivedPlace === vue.labels.karLabelUnknownPlace
            );
            if (filteredProperties.length) {
              let filteredElement = { ...element };
              filteredElement.properties = filteredProperties;
              return filteredElement;
            }
          })
          .filter((element) => element !== undefined);
      } else if (vue.filterPlaces === "twoPlaces") {
        mapData = data
          .map((element) => {
            let filteredProperties = element.properties.filter(
              (property) =>
                property.sentPlace !== vue.labels.karLabelUnknownPlace &&
                property.receivedPlace !== vue.labels.karLabelUnknownPlace
            );
            if (filteredProperties.length) {
              let filteredElement = { ...element };
              filteredElement.properties = filteredProperties;
              return filteredElement;
            }
          })
          .filter((element) => element !== undefined);
      } else {
        mapData = [...data];
      }
      // Add a tile to the map = a background. Comes from OpenStreetmap
      // L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      //   attribution:
      //     'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      //   maxZoom: 15,
      // }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        maxZoom: 15,
        minZoom: 1,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
      }).addTo(map);


      // Add a svg layer to the map
      // L.svg().addTo(map);
      if (vue.filterPlaces !== "onePlace") {
        for (const geoObj of mapData) {
          if (geoObj.geometry.type === "LineString") {
            const lon1 = Number(geoObj.geometry.coordinates[0][0]);
            const lat1 = Number(geoObj.geometry.coordinates[0][1]);
            const lon2 = Number(geoObj.geometry.coordinates[1][0]);
            const lat2 = Number(geoObj.geometry.coordinates[1][1]);

            const offsetX = lon2 - lon1;
            const offsetY = lat2 - lat1;

            const r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2));

            const theta = Math.atan2(offsetY, offsetX);
            const thetaOffset = 3.14 / 10;

            const r2 = r / 2 / Math.cos(thetaOffset);
            const theta2 = theta + thetaOffset;

            const midpointX = r2 * Math.cos(theta2) + lon1;
            const midpointY = r2 * Math.sin(theta2) + lat1;

            const midpoint = [midpointY, midpointX];

            const heatFactor = geoObj.properties.length
              ? geoObj.properties.length / vue.maxCount
              : 0;

            const path = L.curve(
              ["M", [lat1, lon1], "Q", midpoint, [lat2, lon2]],
              { color: this.setHeatColor(heatFactor), weight: 1 }
            ).addTo(map);

            path.feature = geoObj;
            this.onEachFeature(geoObj, path);
          }
        }
      }

      this.geojson = L.geoJSON(mapData, {
        style: function (feature) {
          const heatFactor = feature.properties.length
            ? feature.properties.length / vue.maxCount
            : 0;

          const myStyle = {
            color: vue.setHeatColor(heatFactor),
            weight: 1,
            opacity: 1,
          };
          return myStyle;
        },
        onEachFeature: this.onEachFeature,
        filter: function (feature, layer) {
          return feature.geometry.type !== "LineString";
        },
        pointToLayer: function (feature, latlng) {
          const heatFactor = feature.properties.length
            ? feature.properties.length / vue.maxCount
            : 0;

          // const geojsonMarkerOptions = {
          //   radius: 3,
          //   fillColor: vue.setHeatColor(heatFactor),
          //   color: vue.setHeatColor(heatFactor),
          //   weight: 1,
          //   opacity: 1,
          //   fillOpacity: 0.8,
          // };
          const markerHtmlStyles = `
                  background-color: ${vue.setHeatColor(heatFactor)};
                  width: 1.5rem;
                  height: 1.5rem;
                  display: block;
                  position: relative;
                  border-radius: 1.5rem 1.5rem 0;
                  transform: rotate(45deg)translate(0.7px,-1.5px);
                  `

          const icon = L.divIcon({ 
            className: "my-custom-pin",
            iconAnchor: [15, 32],
            labelAnchor: [0, 0],
            popupAnchor: [0, -17],
            html: `<span style="${markerHtmlStyles}" />`});
          return L.marker(latlng, {icon: icon}); //L.circleMarker(latlng, geojsonMarkerOptions);
        },
      }).addTo(map);
      if (mapData.length) {
        if (mapData.length > 1) {
          map.fitBounds(this.geojson.getBounds());
        } else {
          map.panInsideBounds(this.geojson.getBounds());
        }
      }

      if (this.legend) this.legend.remove();
      this.legend = L.control({ position: "bottomleft" });
      this.legend.onAdd = function (map) {
        const div = L.DomUtil.create("div", "info legend");
        const uniqueValues = new Set(
          mapData.map((geoObj) => geoObj.properties.length)
        );

        const allValues = Array.from(uniqueValues).sort((a, b) => b - a);

        div.innerHTML += vue.labels.karLegendInfoLabel;

        for (let i = 0; i < allValues.length; i++) {
          if (allValues.length > 10) {
            if (allValues.length - i >= 10 && i <= 10) {
              div.innerHTML += `<i style='background:${vue.setHeatColor(
                allValues[i] / vue.maxCount
              )}'></i> <span>${allValues[i]}</span>${
                allValues[i + 1] ? "<br>" : ""
              }`;
            }
          } else {
            div.innerHTML += `<i style='background:${vue.setHeatColor(
              allValues[i] / vue.maxCount
            )}'></i> <span>${allValues[i]}</span>${
              allValues[i + 1] ? "<br>" : ""
            }`;
          }
        }

        return div;
      };

      this.legend.addTo(map);
    },
    onEachFeature(feature, layer) {
      if (feature.properties.length) {
        let popuptext = [];
        for (let i = 0; i < feature.properties.length; i++) {
          popuptext.push(this.setInitialPopupTexts(feature, i));
        }
        const newpopup = L.popup({
          closeOnClick: false,
          autoClose: false,
        }).setContent(popuptext[0]);
        layer.bindPopup(newpopup);
        layer.on({
          click: this.popupText,
          mouseover: this.setHighlight,
          mouseout: this.resetHighlight,
        });
      }
    },
    setInitialPopupTexts(feature, index) {
      const params = (window.location.href.split('?')[1]) ? new URLSearchParams(window.location.href.split("?")[1]) : "";
      params.delete("s");
      params.delete("p");
      params.delete("d");
      return `${(feature.geometry.type !== "LineString") ? "<h6>" + feature.placeName +  "</h6>" : ""}
      ${(feature.geometry.type !== "LineString") ? '<a href="https://correspsearch.net/de/suche.html?p=' + feature.placeRef + '&d=' + this.correspData.children[0].name + '&' + params + '" target="_blank">' + this.labels.karPopupTextLink1 + this.correspData.children[0].name + this.labels.karPopupTextLink2 + '</a></br></br>' : ""}
      <b>${this.labels.karPopupTextSender}</b> ${feature.properties[index].sender} (${
        feature.properties[index].start
      }) <br/>
                     <b>${this.labels.karPopupTextReceiver}</b> ${
                       feature.properties[index].receiver
                     } (${feature.properties[index].end}) <br/>
                     <b>${this.labels.karPopupTextSenderPlace}</b> ${
                       feature.properties[index].sentPlace
                     } <br/>
                     <b>${this.labels.karPopupTextReceiverPlace}</b> ${
                       feature.properties[index].receivedPlace
                     } <br/>
                     <a href="${
                       feature.properties[index].url
        }" target="_blank">${this.labels.karPopupTextLetterLink}</a><br/>
                     <div class="popupBtnDiv">
                     ${
                       index === 0
                         ? `<button name="prev_${feature.geometry.coordinates.toString()}" onclick="" disabled><</button>`
                         : `<button name="prev_${feature.geometry.coordinates.toString()}" onclick=""><</button>`
                     } ${index + 1}/${feature.properties.length} ${
        index === feature.properties.length
          ? `<button name="next_${feature.geometry.coordinates.toString()}" disabled>></button>`
          : feature.properties.length > 1
          ? `<button name="next_${feature.geometry.coordinates.toString()}">></button>`
          : `<button name="next_${feature.geometry.coordinates.toString()}" disabled>></button>`
      }<div class="popupBtnDiv">`;
    },
    popupText(e, index = 0) {
      const layer = e.target;
      const params = (window.location.href.split('?')[1]) ? new URLSearchParams(window.location.href.split("?")[1]) : "";
      params.delete("s");
      params.delete("p");
      params.delete("d");
      let text = `${(layer.feature.geometry.type !== "LineString") ? "<h6>" + layer.feature.placeName +  "</h6>" : ""}
      ${(layer.feature.geometry.type !== "LineString") ? '<a href="https://correspsearch.net/de/suche.html?p=' + layer.feature.placeRef + '&d=' + this.correspData.children[this.slider.value].name + '&' + params + '" target="_blank">' + this.labels.karPopupTextLink1 + this.correspData.children[this.slider.value].name + this.labels.karPopupTextLink2 + '</a></br></br>' : ""}
      <b>${this.labels.karPopupTextSender}</b> ${
        layer.feature.properties[index].sender
      } (${layer.feature.properties[index].start}) <br/>
                     <b>${this.labels.karPopupTextReceiver}</b> ${
                       layer.feature.properties[index].receiver
                     } (${layer.feature.properties[index].end}) <br/>
                     <b>${this.labels.karPopupTextSenderPlace}</b> ${
                       layer.feature.properties[index].sentPlace
                     } <br/>
                     <b>${this.labels.karPopupTextReceiverPlace}</b> ${
                       layer.feature.properties[index].receivedPlace
                     } <br/>
                     <a href="${
                       layer.feature.properties[index].url
        }" target="_blank">${this.labels.karPopupTextLetterLink}</a><br/>
                     <div class="popupBtnDiv">
                     ${
                       index === 0
                         ? `<button class="popupBtn" name="prev_${layer.feature.geometry.coordinates.toString()}" disabled><</button>`
                         : `<button class="popupBtn" name="prev_${layer.feature.geometry.coordinates.toString()}"><</button>`
                     } ${index + 1}/${layer.feature.properties.length} ${
        index === layer.feature.properties.length - 1
          ? `<button class="popupBtn" name="next_${layer.feature.geometry.coordinates.toString()}" disabled>></button>`
          : layer.feature.properties.length > 1
          ? `<button class="popupBtn" name="next_${layer.feature.geometry.coordinates.toString()}">></button>`
          : `<button class="popupBtn" name="next_${layer.feature.geometry.coordinates.toString()}" disabled>></button>`
      }</div>`;
      layer.setPopupContent(text);

      const nextBtns = document.getElementsByName(
        `next_${layer.feature.geometry.coordinates.toString()}`
      );

      const prevBtns = document.getElementsByName(
        `prev_${layer.feature.geometry.coordinates.toString()}`
      );

      for (const btn of nextBtns) {
        btn.addEventListener("click", () => {
          this.popupText(e, index + 1);
        });
      }
      for (const btn of prevBtns) {
        btn.addEventListener("click", () => {
          this.popupText(e, index - 1);
        });
      }
    },
    setHighlight(e) {
      let markerList = document.getElementsByClassName("my-custom-pin");
            for (let i = 0; i < markerList.length; i++) {
              const currentStyle = markerList.item(i).innerHTML;
              markerList.item(i).innerHTML = currentStyle.replace("border: 3px solid #FFFFFF", "");
            }
      if (e.target.feature) {
        const layer = e.target;
        if (layer._path != undefined) {
          layer.setStyle({
            weight: 5,
            opacity: 0.5,
          });
          layer.bringToFront();
        } else if (e.target._icon) {
            const currentStyle = e.target._icon.innerHTML;
            e.target._icon.innerHTML = currentStyle.replace("translate(0.7px,-1.5px);", "translate(0.7px,-1.5px); border: 3px solid #FFFFFF");
        }
      }
    },
    resetHighlight(e) {
      if (e.target.feature) {
        let markerList = document.getElementsByClassName("my-custom-pin");
            for (let i = 0; i < markerList.length; i++) {
              const currentStyle = markerList.item(i).innerHTML;
              markerList.item(i).innerHTML = currentStyle.replace("border: 3px solid #FFFFFF", "");
            }
        if (e.target.feature.geometry.type === "Point") {
          if (e.target._path != undefined) {
           this.geojson.resetStyle(e.target);
          }
        } else {
          e.target.setStyle({ weight: 1, opacity: 1 });
          e.target.bringToBack();
        }
      }
    },
    udpateWindowWidth() {
      if (this.correspData.children.length <= 6) {
        document.getElementById("myRange").parentElement.parentElement.style.width = "10%"
        document.getElementById("myRange").parentElement.parentElement.style.left = "45%"
        document.getElementById("myRange").parentElement.parentElement.style.padding = "0 20px 0 20px"
      }
      if (this.$refs.myRange) this.sliderWidth = this.$refs.myRange.offsetWidth;
      document.documentElement.style.setProperty(
        "--labelWidth",
        `${this.sliderWidth / (this.correspData.children.length - 1)}`
      );
      document.documentElement.style.setProperty(
        "--abweichung",
        `${
          (this.sliderWidth / (this.correspData.children.length - 1) / 100) *
          1.08
        }`
      );
      this.$forceUpdate();
    },
    updateYear(index) {
      this.setMaxCount(index);
      this.rangeLabels = document.querySelector("ul.range-labels li.selected");
      this.rangeLabels.classList.remove("selected");
      const currentLabel = document.querySelector(
        `ul.range-labels li:nth-child(${Number(index) + 1})`
      );
      this.setFocusObject(index);
      currentLabel.classList.add("selected");
      this.generateConnectionMap(
        this.correspData.children[index].children,
        this.map
      );
    },
    setSliderValue(event) {
      if (event.target.parentNode.tagName === "LI") {
        const allListElements = Array.from(
          event.target.parentNode.parentNode.childNodes
        );
        this.slider.value = allListElements.indexOf(event.target.parentNode);
        this.slider.dispatchEvent(new Event("input"));
      } else {
        const allListElements = Array.from(event.target.parentNode.childNodes);
        this.slider.value = allListElements.indexOf(event.target);
        this.slider.dispatchEvent(new Event("input"));
      }
    },
    setFocusObject(index) {
      this.focusDiagram = index;
    },
    changeYear(yearFromChart) {
      const indexOfYear = this.correspData.children.findIndex(
        (year) => year.name === yearFromChart
      );
      this.slider.value = indexOfYear;
      this.updateYear(indexOfYear);
    },
    setHeatColor(value) {
      return d3.interpolateRgb.gamma(1.8)("mediumblue ", "red")(value);
    },
    setFilterforPlaces(filter) {
        this.filterPlaces = filter;
        this.generateConnectionMap(
          this.correspData.children[this.slider.value].children,
          this.map
        );
    },
    adaptJsonToConnectionMapData(jsonFile) {
      const connectionMapFormat = {};
      const placeStatistics = [];
      connectionMapFormat.name = jsonFile.hits.hits[0]._source.names[0].text;
      connectionMapFormat.children = [];
      for (const letter of jsonFile.hits.hits) {
        let year = "";
        let startDate = "";
        let endDate = "";
        let sender = "";
        let receiver = "";
        let senderPlace = {};
        let receiverPlace = {};
        let canonical_ref_name_sender = "";
        let canonical_ref_name_receiver = "";
        let canonical_ref_place_sender = "";
        let canonical_ref_place_receiver = "";
        let canonical_name_place_sender = "";
        let canonical_name_place_receiver = "";
        const noPlacesLabel = "0 Orte";
        const onePlaceLabel = "1 Ort";
        const twoPlacesLabel = "2 Orte";

        const params = (window.location.href.split('?')[1]) ? new URLSearchParams(window.location.href.split("?")[1]) : "";
        params.delete("s");
        params.delete("p");
        params.delete("d");

        if (letter._source.dates) {
          year = letter._source.dates[0].start.split("-")[0];
          startDate = letter._source.dates[0].start;
          endDate = letter._source.dates[0].end;
        } else {
          year = "O. A.";
          startDate = "Unknown Start";
          endDate = "Unknown End";
        }
        if (letter._source.names) {
          const receiverName = letter._source.names.find(
            (name) =>
              name.action === "received" &&
              name.action !==
                jsonFile.hits.hits[0]._source.names[0].canonical_name
          );
          const senderName = letter._source.names.find(
            (name) => name.action === "sent"
          );
          if (receiverName) {
            receiver = receiverName.canonical_name;
            canonical_ref_name_receiver = receiverName.canonical_ref;
          } else {
            receiver = "Unknown Receiver";
          }
          if (senderName) {
            sender = senderName.canonical_name;
            canonical_ref_name_sender = senderName.canonical_ref;
          } else {
            sender = "Unknown Sender";
          }
        } else {
          receiver = "Unknown Receiver";
          sender = "Unknown Sender";
        }
        if (letter._source.places) {
          if (
            letter._source.places.length >= 2 &&
            letter._source.places.find((place) => place.action === "sent") &&
            letter._source.places.find((place) => place.action === "received")
          ) {
            senderPlace = letter._source.places.find(
              (place) => place.action === "sent"
            );
            receiverPlace = letter._source.places.find(
              (place) => place.action === "received"
            );
            canonical_ref_place_sender = senderPlace.canonical_ref;
            canonical_ref_place_receiver = receiverPlace.canonical_ref;
            canonical_name_place_sender = senderPlace.canonical_name_de;
            canonical_name_place_receiver = receiverPlace.canonical_name_de;
            const yearObject = placeStatistics.find(
              (element) => element.year === year
            );
            if (!yearObject) {
              placeStatistics.push({
                year: year,
                statistics: {
                  twoPlaces: {
                    label: twoPlacesLabel,
                    value: 1,
                  },
                },
              });
            } else {
              if (yearObject.statistics.twoPlaces) {
                yearObject.statistics.twoPlaces.value += 1;
              } else {
                yearObject.statistics.twoPlaces = {
                  label: twoPlacesLabel,
                  value: 1,
                };
              }
            }
          } else if (
            letter._source.places.find((place) => place.action === "sent")
          ) {
            senderPlace = letter._source.places.find(
              (place) => place.action === "sent"
            );
            canonical_name_place_sender = senderPlace.canonical_name_de;
            canonical_ref_place_sender = senderPlace.canonical_ref;
            const yearObject = placeStatistics.find(
              (element) => element.year === year
            );
            if (!yearObject) {
              placeStatistics.push({
                year: year,
                statistics: {
                  onePlace: {
                    label: onePlaceLabel,
                    value: 1,
                  },
                },
              });
            } else {
              if (yearObject.statistics.onePlace) {
                yearObject.statistics.onePlace.value += 1;
              } else {
                yearObject.statistics.onePlace = {
                  label: onePlaceLabel,
                  value: 1,
                };
              }
            }
          } else if (
            letter._source.places.find((place) => place.action === "received")
          ) {
            receiverPlace = letter._source.places.find(
              (place) => place.action === "received"
            );
            canonical_name_place_receiver = receiverPlace.canonical_name_de;
            canonical_ref_place_receiver = receiverPlace.canonical_ref;
            // add counter for one place to place statistics
            const yearObject = placeStatistics.find(
              (element) => element.year === year
            );
            if (!yearObject) {
              placeStatistics.push({
                year: year,
                statistics: {
                  onePlace: {
                    label: onePlaceLabel,
                    value: 1,
                  },
                },
              });
            } else {
              if (yearObject.statistics.onePlace) {
                yearObject.statistics.onePlace.value += 1;
              } else {
                yearObject.statistics.onePlace = {
                  label: onePlaceLabel,
                  value: 1,
                };
              }
            }
          }
        } else {
          const yearObject = placeStatistics.find(
            (element) => element.year === year
          );
          if (!yearObject) {
            placeStatistics.push({
              year: year,
              statistics: {
                noPlaces: {
                  label: noPlacesLabel,
                  value: 1,
                },
              },
            });
          } else {
            if (yearObject.statistics.noPlaces) {
              yearObject.statistics.noPlaces.value += 1;
            } else {
              yearObject.statistics.noPlaces = {
                label: noPlacesLabel,
                value: 1,
              };
            }
          }
        }
        const fittingDate = connectionMapFormat.children.find(
          (element) => element.name === year
        );
        if (!fittingDate) {
          if (senderPlace.location && receiverPlace.location) {
            if (
              senderPlace.location.lon === receiverPlace.location.lon &&
              senderPlace.location.lat === receiverPlace.location.lat
            ) {
              const urlString = this.buildUrlString(canonical_ref_name_sender, canonical_ref_name_receiver, canonical_ref_place_sender, canonical_ref_place_receiver, startDate, params);
              connectionMapFormat.children.push({
                name: year,
                children: [
                  {
                    type: "Feature",
                    properties: [
                      {
                        sender: sender,
                        receiver: receiver,
                        start: startDate,
                        end: endDate,
                        sentPlace: canonical_name_place_sender,
                        receivedPlace: canonical_name_place_receiver,
                        url: urlString,
                      },
                    ],
                    placeName: canonical_name_place_sender,
                    placeRef: canonical_ref_place_sender,
                    geometry: {
                      type: "Point",
                      coordinates: [
                        senderPlace.location.lon,
                        senderPlace.location.lat,
                      ],
                    },
                  },
                ],
              });
            } else {
              const urlString = this.buildUrlString(canonical_ref_name_sender, canonical_ref_name_receiver, canonical_ref_place_sender, canonical_ref_place_receiver, startDate, params);
              connectionMapFormat.children.push({
                name: year,
                children: [
                  {
                    type: "Feature",
                    properties: [
                      {
                        sender: sender,
                        receiver: receiver,
                        start: startDate,
                        end: endDate,
                        sentPlace: canonical_name_place_sender,
                        receivedPlace: canonical_name_place_receiver,
                        url: urlString,
                      },
                    ],
                    geometry: {
                      type: "LineString",
                      coordinates: [
                        [senderPlace.location.lon, senderPlace.location.lat],
                        [
                          receiverPlace.location.lon,
                          receiverPlace.location.lat,
                        ],
                      ],
                    },
                  },
                  {
                    type: "Feature",
                    properties: [
                      {
                        sender: sender,
                        receiver: receiver,
                        start: startDate,
                        end: endDate,
                        sentPlace: canonical_name_place_sender,
                        receivedPlace: canonical_name_place_receiver,
                        url: urlString,
                      },
                    ],
                    placeName: canonical_name_place_sender,
                    placeRef: canonical_ref_place_sender,
                    geometry: {
                      type: "Point",
                      coordinates: [
                        senderPlace.location.lon,
                        senderPlace.location.lat,
                      ],
                    },
                  },
                  {
                    type: "Feature",
                    properties: [
                      {
                        sender: sender,
                        receiver: receiver,
                        start: startDate,
                        end: endDate,
                        sentPlace: canonical_name_place_sender,
                        receivedPlace: canonical_name_place_receiver,
                        url: urlString,
                      },
                    ],
                    placeName: canonical_name_place_receiver,
                    placeRef: canonical_ref_place_receiver,
                    geometry: {
                      type: "Point",
                      coordinates: [
                        receiverPlace.location.lon,
                        receiverPlace.location.lat,
                      ],
                    },
                  },
                ],
              });
            }
          } else if (senderPlace.location && !receiverPlace.location) {
            const urlString = this.buildUrlString(canonical_ref_name_sender, canonical_ref_name_receiver, canonical_ref_place_sender, canonical_ref_place_receiver, startDate, params);
            connectionMapFormat.children.push({
              name: year,
              children: [
                {
                  type: "Feature",
                  properties: [
                    {
                      sender: sender,
                      receiver: receiver,
                      start: startDate,
                      end: endDate,
                      sentPlace: canonical_name_place_sender,
                      receivedPlace: this.labels.karLabelUnknownPlace, //Label verwenden?
                      url: urlString,
                    },
                  ],
                  placeName: canonical_name_place_sender,
                  placeRef: canonical_ref_place_sender,
                  geometry: {
                    type: "Point",
                    coordinates: [
                      senderPlace.location.lon,
                      senderPlace.location.lat,
                    ],
                  },
                },
              ],
            });
          } else if (!senderPlace.location && receiverPlace.location) {
            const urlString = this.buildUrlString(canonical_ref_name_sender, canonical_ref_name_receiver, canonical_ref_place_sender, canonical_ref_place_receiver, startDate, params);
            connectionMapFormat.children.push({
              name: year,
              children: [
                {
                  type: "Feature",
                  properties: [
                    {
                      sender: sender,
                      receiver: receiver,
                      start: startDate,
                      end: endDate,
                      sentPlace: this.labels.karLabelUnknownPlace,
                      receivedPlace: canonical_name_place_receiver,
                      url: urlString,
                    },
                  ],
                  placeName: canonical_name_place_receiver,
                  placeRef: canonical_ref_place_receiver,
                  geometry: {
                    type: "Point",
                    coordinates: [
                      receiverPlace.location.lon,
                      receiverPlace.location.lat,
                    ],
                  },
                },
              ],
            });
          }
        } else {
          if (senderPlace.location && receiverPlace.location) {
            if (
              senderPlace.location.lon === receiverPlace.location.lon &&
              senderPlace.location.lat === receiverPlace.location.lat
            ) {
              const urlString = this.buildUrlString(canonical_ref_name_sender, canonical_ref_name_receiver, canonical_ref_place_sender, canonical_ref_place_receiver, startDate, params);
              let feature = fittingDate.children.find(
                (element) =>
                  element.geometry.coordinates.toString() ===
                  [
                    senderPlace.location.lon,
                    senderPlace.location.lat,
                  ].toString()
              );
              if (feature) {
                feature.properties.push({
                  sender: sender,
                  receiver: receiver,
                  start: startDate,
                  end: endDate,
                  sentPlace: canonical_name_place_sender,
                  receivedPlace: canonical_name_place_receiver,
                  url: urlString,
                });
              } else {
                fittingDate.children.push({
                  type: "Feature",
                  properties: [
                    {
                      sender: sender,
                      receiver: receiver,
                      start: startDate,
                      end: endDate,
                      sentPlace: canonical_name_place_sender,
                      receivedPlace: canonical_name_place_receiver,
                      url: urlString,
                    },
                  ],
                  placeName: canonical_name_place_sender,
                  placeRef: canonical_ref_place_sender,
                  geometry: {
                    type: "Point",
                    coordinates: [
                      senderPlace.location.lon,
                      senderPlace.location.lat,
                    ],
                  },
                });
              }
            } else {
              const urlString = this.buildUrlString(canonical_ref_name_sender, canonical_ref_name_receiver, canonical_ref_place_sender, canonical_ref_place_receiver, startDate, params);
              let feature = fittingDate.children.find(
                (element) =>
                  element.geometry.coordinates.toString() ===
                  [
                    [senderPlace.location.lon, senderPlace.location.lat],
                    [receiverPlace.location.lon, receiverPlace.location.lat],
                  ].toString()
              );
              if (feature) {
                feature.properties.push({
                  sender: sender,
                  receiver: receiver,
                  start: startDate,
                  end: endDate,
                  sentPlace: canonical_name_place_sender,
                  receivedPlace: canonical_name_place_receiver,
                  url: urlString,
                });
              } else {
                fittingDate.children.push({
                  type: "Feature",
                  properties: [
                    {
                      sender: sender,
                      receiver: receiver,
                      start: startDate,
                      end: endDate,
                      sentPlace: canonical_name_place_sender,
                      receivedPlace: canonical_name_place_receiver,
                      url: urlString,
                    },
                  ],
                  geometry: {
                    type: "LineString",
                    coordinates: [
                      [senderPlace.location.lon, senderPlace.location.lat],
                      [receiverPlace.location.lon, receiverPlace.location.lat],
                    ],
                  },
                });
                let senderFeature = fittingDate.children.find(
                  (element) =>
                    element.geometry.coordinates.toString() ===
                    [
                      senderPlace.location.lon,
                      senderPlace.location.lat,
                    ].toString()
                );
                if (senderFeature) {
                  senderFeature.properties.push({
                    sender: sender,
                    receiver: receiver,
                    start: startDate,
                    end: endDate,
                    sentPlace: canonical_name_place_sender,
                    receivedPlace: canonical_name_place_receiver,
                    url: urlString,
                  });
                } else {
                  fittingDate.children.push({
                    type: "Feature",
                    properties: [
                      {
                        sender: sender,
                        receiver: receiver,
                        start: startDate,
                        end: endDate,
                        sentPlace: canonical_name_place_sender,
                        receivedPlace: canonical_name_place_receiver,
                        url: urlString,
                      },
                    ],
                    placeName: canonical_name_place_sender,
                    placeRef: canonical_ref_place_sender,
                    geometry: {
                      type: "Point",
                      coordinates: [
                        senderPlace.location.lon,
                        senderPlace.location.lat,
                      ],
                    },
                  });
                }
                let receiverFeature = fittingDate.children.find(
                  (element) =>
                    element.geometry.coordinates.toString() ===
                    [
                      receiverPlace.location.lon,
                      receiverPlace.location.lat,
                    ].toString()
                );
                if (receiverFeature) {
                  receiverFeature.properties.push({
                    sender: sender,
                    receiver: receiver,
                    start: startDate,
                    end: endDate,
                    sentPlace: canonical_name_place_sender,
                    receivedPlace: canonical_name_place_receiver,
                    url: urlString,
                  });
                } else {
                  fittingDate.children.push({
                    type: "Feature",
                    properties: [
                      {
                        sender: sender,
                        receiver: receiver,
                        start: startDate,
                        end: endDate,
                        sentPlace: canonical_name_place_sender,
                        receivedPlace: canonical_name_place_receiver,
                        url: urlString,
                      },
                    ],
                    placeName: canonical_name_place_receiver,
                    placeRef: canonical_ref_place_receiver,
                    geometry: {
                      type: "Point",
                      coordinates: [
                        receiverPlace.location.lon,
                        receiverPlace.location.lat,
                      ],
                    },
                  });
                }
              }
            }
          } else if (senderPlace.location && !receiverPlace.location) {
            const urlString = this.buildUrlString(canonical_ref_name_sender, canonical_ref_name_receiver, canonical_ref_place_sender, canonical_ref_place_receiver, startDate, params);
            let feature = fittingDate.children.find(
              (element) =>
                element.geometry.coordinates.toString() ===
                [senderPlace.location.lon, senderPlace.location.lat].toString()
            );
            if (feature) {
              feature.properties.push({
                sender: sender,
                receiver: receiver,
                start: startDate,
                end: endDate,
                sentPlace: canonical_name_place_sender,
                receivedPlace: this.labels.karLabelUnknownPlace,
                url: urlString,
              });
            } else {
              fittingDate.children.push({
                type: "Feature",
                properties: [
                  {
                    sender: sender,
                    receiver: receiver,
                    start: startDate,
                    end: endDate,
                    sentPlace: canonical_name_place_sender,
                    receivedPlace: this.labels.karLabelUnknownPlace,
                    url: urlString,
                  },
                ],
                placeName: canonical_name_place_sender,
                placeRef: canonical_ref_place_sender,
                geometry: {
                  type: "Point",
                  coordinates: [
                    senderPlace.location.lon,
                    senderPlace.location.lat,
                  ],
                },
              });
            }
          } else if (!senderPlace.location && receiverPlace.location) {
            const urlString = this.buildUrlString(canonical_ref_name_sender, canonical_ref_name_receiver, canonical_ref_place_sender, canonical_ref_place_receiver, startDate, params);
            let feature = fittingDate.children.find(
              (element) =>
                element.geometry.coordinates.toString() ===
                [
                  receiverPlace.location.lon,
                  receiverPlace.location.lat,
                ].toString()
            );
            if (feature) {
              feature.properties.push({
                sender: sender,
                receiver: receiver,
                start: startDate,
                end: endDate,
                sentPlace: this.labels.karLabelUnknownPlace,
                receivedPlace: canonical_name_place_receiver,
                url: urlString,
              });
            } else {
              fittingDate.children.push({
                type: "Feature",
                properties: [
                  {
                    sender: sender,
                    receiver: receiver,
                    start: startDate,
                    end: endDate,
                    sentPlace: this.labels.karLabelUnknownPlace,
                    receivedPlace: canonical_name_place_receiver,
                    url: urlString,
                  },
                ],
                placeName: canonical_name_place_receiver,
                placeRef: canonical_ref_place_receiver,
                geometry: {
                  type: "Point",
                  coordinates: [
                    receiverPlace.location.lon,
                    receiverPlace.location.lat,
                  ],
                },
              });
            }
          }
        }
      }
      const filteredPlacesStatistics = placeStatistics.filter((year) => (year.statistics.onePlace || year.statistics.twoPlaces));
      
      this.placeStatistics = filteredPlacesStatistics;
      return connectionMapFormat;
    },
    buildUrlString(sender, receiver, senderPlace, receiverPlace, date, additionalParams) {
      let urlString = `https://correspsearch.net/de/suche.html?s=`;
      if (sender !== "Unknown Sender" && sender !== undefined) {
        urlString = urlString.concat(sender, "::sent");
      }
      if (receiver !== "Unknown Receiver" && receiver !== undefined) {
        if (sender !== "Unknown Sender" && sender !== undefined) {
          urlString = urlString.concat(",");
        }
        urlString = urlString.concat(receiver, "::received");
      }
      urlString = urlString.concat("&p=");
      if (senderPlace !== "" && senderPlace !== undefined) {
        urlString = urlString.concat(senderPlace, "::sent");
      }
      if (receiverPlace !== "" && receiverPlace !== undefined) {
        if (senderPlace !== "" && senderPlace !== undefined) {
          urlString = urlString.concat(",");
        }
        urlString = urlString.concat(receiverPlace, "::received");
      }
      urlString = urlString.concat("&d=");
      if (date !== "Unknown Start") {
        urlString = urlString.concat(date);
      }
      if (additionalParams.toString() !== "") {
        urlString = urlString.concat("&", additionalParams);
      }
      let urlStrings = urlString.split("?");
      urlStrings[1] = encodeURIComponent(urlStrings[1]);
      const encodedURL = urlStrings[0].concat("?", urlStrings[1]);
      return encodeURI(urlString);
    },
  },
};
</script>

<style>
.popupBtn {
  background: none !important;
  border: none;
  margin-top: 1px;
  padding: 10;
  /*optional*/
  font-family: arial, sans-serif;
  /* font-weight: bold; */
  font-size: large;
  /*input has OS specific font-family*/
  color: black;
  text-decoration: none;
  cursor: pointer;
  vertical-align: middle;
}

.popupBtn:hover {
  /* text-decoration: underline; */
  /* background-color: #17a2b8 !important; */
  color: #069;
}

.popupBtn:disabled {
  color: lightslategray;
}

.popupBtnDiv {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
}

#buttonMenu {
  position: absolute;
  z-index: 2;
  top: 65px;
  left: 50px;
}

.menuButton {
  height: 30px;
  width: 50px;
  background-color: white;
  border-radius: 5px;
  border: 2px solid rgba(0, 0, 0, 0.2);
}

#dropdown-menu {
  margin-top: 1px;
  background-color: white;
}

.menuButton:hover {
  background-color: lightgray;
}

#dropdown-menu__BV_toggle_ {
  background-color: white;
  border: none;
}

#dropdown-menu__BV_toggle_:hover{
  background-color: lightgray;
}

.dropdown-active{
  background: #555555 !important;
  color: white !important;
}

#infoButtonMap {
  position: absolute;
  z-index: 2;
  left: 100px;
  top: 60px;
  width: 25px;
  height: 25px;
  margin-top: 7px;
  margin-left: 7px;
}

#infoButtonMap:hover {
  fill: #007bff;
}

#connectionMapContainer {
  height: 84vh;
  width: 100%;
  position: absolute;
  z-index: 1;
}

#sliderButton {
  position: fixed;
  border: none;
  bottom: 17px;
  left: 50%;
  height: 30px;
  width: 50px;
  z-index: 2;
  background-color: white;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
  border-radius: 5px;
}

.collapsed {
  background-color: white;
}

.not-collapsed {
  background-color: #555555 !important;
}

.not-collapsed svg {
  /* color: white; */
  fill: white;
}

.collapsed > .when-collapsed,
.not-collapsed > .when-open {
  display: none !important;
}

#sliderButton:hover {
  background-color: #f0f0f0;
}

.slider-title {
  width: auto;
  display: flex;
  margin-top: 5px;
  margin-bottom: 0px;
  height: fit-content;
  font-size: smaller;
  font-weight: bold;
  color: #555555;
  justify-content: center;
}

.slidecontainer {
  border-top: solid lightgray 1px;
  width: 60%; /* Width of the outside container */
  height: 95px;
  /* padding-top: 1em; */
  bottom: 5%;
  left: 20%;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  position: absolute;
  z-index: 1;
}

.slider {
  appearance: none;
  width: 95%;
  height: 25px;
  border-radius: 15px;
  opacity: 0.7;
  -webkit-transition: 0.2s;
  transition: opacity 0.2s;
  background: rgba(255, 255, 255, 0.8);
}

.slider:hover {
  opacity: 1; 
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  margin: -6px 0 0;
  border-radius: 50%;
  background: #17a2b8;
  cursor: pointer;
  border: 0 !important;
}

.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  margin: -6px 0 0;
  border-radius: 50%;
  background: #17a2b8;
  cursor: pointer;
  border: 0 !important;
}

.slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 2px;
  cursor: pointer;
  background: #555555;
}

/* Non-Standard, evtl nicht benutzen */
.slider::-moz-range-track {
  width: 100%;
  height: 2px;
  cursor: pointer;
  background: #555555;
}

/* Wrapper fuer slider */
.range {
  margin-top: 5px;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: center;
  align-items: center;
}

.range-labels {
  margin-top: 8px;
  /* margin-left: -87.1111px; */
  padding: 0;
  display: flex;
  flex-wrap: nowrap;
  list-style: none;
}

.label-text {
  display: block;
  transform: translateX(-10px) rotate(-45deg);
}

.range-labels li {
  position: relative;
  float: left;
  width: calc((var(--labelWidth) - var(--abweichung)) * 1px);
  text-align: center;
  color: #555555;
  font-size: 12px;
  cursor: pointer;
  overflow: visible;
  white-space: nowrap;
}

.range-labels li::before {
  position: absolute;
  top: -25px;
  right: 0;
  left: 0;
  content: "";
  margin: 0 auto;
  width: 9px;
  height: 9px;
  background: #555555;
  border-radius: 50%;
}

.selected {
  color: #007bff !important;
}

.selected::before {
  display: none;
}

#wrapper {
  height: 84vh;
  /* display: flex;
  flex-direction: row; */
}

#mapAndSliderContainer {
  width: 100%;
  height: 100%;
}

.ticks-container {
  /* display: flex;
    justify-content: space-between; */
  margin-top: -5px;
}

.tick {
  width: 2px;
  height: 8px;
  background-color: lightgray;
  position: absolute;
}

#barChartContainer {
  position: absolute;
  max-width: 15vw;
  height: 75vh;
  display: flex;
  top: 10px;
  right: 0.3%;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end; /* Added for Vertical alignment */
  background: rgba(255, 255, 255, 0);
  z-index: 1;
}

.legend {
  position: fixed;
  bottom: 80px;
}

.legend i {
  width: 18px;
  height: 18px;
  float: left;
  margin-right: 8px;
  opacity: 0.7;
}

.info {
  padding: 6px 8px;
  font: 14px/18px Arial, Helvetica, sans-serif;
  background: white;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
  border-radius: 5px;
}

.my-custom-pin{
  position: absolute;
  width: 35px !important;
  height: 35px !important;
  padding: 2px;
  border-radius: 1.5rem;
  fill: black;
}
</style>
