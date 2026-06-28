import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Chart } from 'chart.js/auto';

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const map = L.map("map").setView([35.6895, 139.6917], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);
function getRadius(mag) {
  return mag ? mag * 4 : 4;
}

function getColor(mag) {
  return mag >= 8 ? "black"
     : mag >= 7 ? "purple"
     : mag >= 5 ? "red"
     : mag >= 3 ? "yellow"
     : "green";
}

function toShindo(mmi) {
  if (!mmi) return "不明";

  if (mmi >= 9) return "震度7";
  if (mmi >= 8) return "震度6強";
  if (mmi >= 7) return "震度6弱";
  if (mmi >= 6) return "震度5強";
  if (mmi >= 5) return "震度5弱";
  if (mmi >= 4) return "震度4";
  if (mmi >= 3) return "震度3";
  if (mmi >= 2) return "震度2";
  return "震度1以下";
}
function estimateShindo(mag, depth) {
  // 深いほど弱くなる補正
  const adjustedMag = mag - Math.log10(depth + 10);

  if (adjustedMag >= 6.5) return "震度7相当";
  if (adjustedMag >= 6.0) return "震度6強";
  if (adjustedMag >= 5.5) return "震度6弱";
  if (adjustedMag >= 5.0) return "震度5強";
  if (adjustedMag >= 4.5) return "震度5弱";
  if (adjustedMag >= 4.0) return "震度4";
  if (adjustedMag >= 3.5) return "震度3";
  return "震度2以下";
}
const object = {
  "start": [
    "2011-03-10",
    "1960-05-21",
    "2025-07-29",
    "2004-12-25"
  ],
  "end": [
    "2011-03-12",
    "1960-05-23",
    "2025-07-31",
    "2004-12-27"
  ]
}

let val = Math.floor(Math.random() * 4)
const newurl = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
newurl.searchParams.set("format", "geojson");
newurl.searchParams.set("starttime", object.start[val]);
newurl.searchParams.set("endtime", object.end[val]);
newurl.searchParams.set("minmagnitude", "4");

let blacks = 0;
let purples = 0;
let reds = 0;
let yellows = 0;
let greens = 0;
let allearthquake = 0;
let maxmagnitude = -1;
let minmagnitude = 99999;
const ctx = document.getElementById('chart')
const chart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['黒', '紫', '赤', "黄色", "緑"],
    datasets: [{
      label: "地震チャート",
      data: [blacks, purples, reds, yellows, greens]
    }]
  }
 });

const table = document.getElementById("table");
function load(url) {
  map.eachLayer(function(layer) {
    if (layer instanceof L.CircleMarker) {
      map.removeLayer(layer);
    }
  });
  fetch(url)
    .then(res => res.json())
    .then(data => {

      data.features.forEach(eq => {
        const coords = eq.geometry.coordinates;
        const mag = eq.properties.mag;
        const place = eq.properties.place;
        const time = new Date(eq.properties.time);
        const mmi = eq.properties.mmi;
        allearthquake += 1;
        if(maxmagnitude < mag) {
          maxmagnitude = mag;
        }
        if(minmagnitude > mag) {
          minmagnitude = mag;
        }

        const lat = coords[1];
        const lon = coords[0];
        switch(getColor(mag)) {
          case "black":
            blacks += 1;
            break;
          case "purple":
            purples += 1;
            break;
          case "red":
            reds += 1;
            break;
          case "yellow":
            yellows += 1;
            break;
          case "green":
            greens += 1;
            break;
        }

        // 4. Circle marker with color coding
        L.circleMarker([lat, lon], {
          radius: getRadius(mag) / 2,
          fillColor: getColor(mag),
          color: "#000",
          weight: 1,
          fillOpacity: 0.8
        })
        .addTo(map)
        .bindPopup(`
          <b>${place}</b><br>
          マグニチュード: ${mag}<br>
          深さ: ${coords[2]} km<br>
          時間：${time.toLocaleString("ja-JP")}<br>
          MMI推定震度：${toShindo(mmi)}<br>
          マグニチュード・深さ推定震度：${estimateShindo(mag, coords[2])}
        `);

        table.insertAdjacentHTML("beforeend",`
          <tr>
            <td>${place}</td>
            <td>${mag}</td>
            <td>${coords[2]}km</td>
            <td>${time.toLocaleString("ja-JP")}</td>
            <td>${toShindo(mmi)}</td>
            <td>${estimateShindo(mag, coords[2])}</td>
          </tr>
          `);
        document.getElementById("error").textContent = `エラーは見つかりませんでした`;
      });
      document.getElementById("allearthquake").textContent = `見つかった地震の数：${allearthquake}`;
      document.getElementById("maxmagnitude").textContent = `最大マグニチュード：${maxmagnitude}`;
      document.getElementById("minmagnitude").textContent = `最小マグニチュード：${minmagnitude}`;
      chart.data.datasets[0].data = [blacks, purples, reds, yellows, greens];
      chart.update();
    })
    .catch(err => {
      document.getElementById("error").textContent = `エラーが発生しました。地震が多すぎか、日付が正しくありません。メッセージ：${err.message}`;
    });
}
load(newurl);

const openorclose = document.getElementById("openorclose")
openorclose.onclick = function() {
  const table = document.querySelector("table");
  if(table.hidden) {
    table.hidden = false;
    openorclose.textContent = "閉じる";
  } else {
    table.hidden = true;
    openorclose.textContent = "開く";
  }
}
document.getElementById("reload").onclick = function() {
  const loadurl = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
  loadurl.searchParams.set("format", "geojson");
  loadurl.searchParams.set("starttime", document.getElementById("startdate").value);
  loadurl.searchParams.set("endtime", document.getElementById("enddate").value);
  loadurl.searchParams.set("minmagnitude", (document.getElementById("magnitude").value).toString());
  loadurl.searchParams.set("limit", "20000");
  blacks = 0;
  purples = 0;
  reds = 0;
  yellows = 0;
  greens = 0;
  allearthquake = 0;
  maxmagnitude = -1;
  minmagnitude = 99999;
  load(loadurl);
}