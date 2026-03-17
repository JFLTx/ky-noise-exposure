import maplibregl from "maplibre-gl";
import "/src/style.css";
import "maplibre-gl/dist/maplibre-gl.css";

// loading screen
const loadingScreen = document.getElementById("loading-screen");

const map = new maplibregl.Map({
  container: "map",
  style: "/style.json",
  center: [-85.5, 37.6],
  zoom: 7,
  minZoom: 6,
  maxZoom: 16,
  attributionControl: false,
});

// hide the loading screen once data loads
map.on("idle", () => {
  loadingScreen.classList.add("hidden");
});

// set variables to min and max noise levels in map
const min = 45;
const max = 124;

const indicator = document.getElementById("heatmap-indicator");
const readout = document.getElementById("heatmap-readout");

// force the clicked noise value to stay in legend range
// legend range is the min and max values
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// When the user clicks, clamps the clicked value to the legend range
// calculates the percentage position along the bar
// moves the triangle to the % bar position
// Lastly, update the readout value to the clicked value
function updateLegend(value) {
  if (!Number.isFinite(value)) return;

  const clamped = clamp(value, min, max);
  const percent = ((clamped - min) / (max - min)) * 100;
  const pretty = clamped.toFixed(1);

  indicator.style.left = `${percent}%`;
  indicator.style.opacity = "1";

  readout.textContent = `${pretty} dB`;
}

// Functions to determine noise values as a screening tool
// real estimates should be measured on a project-by-project basis
// these only are to provide ESTIMATES and should not be used for planning
// Sources: https://www.fhwa.dot.gov/Environment/noise/resources/reviewing_noise_analysis | https://www.fhwa.dot.gov/Environment/noise/resources/reviewing_tnm_model

// function to mathematically return noise estimates as a screening tool
// This will be calculated on the fly and appended to each KYTC Traffic Count Feature
function noiseEstimate(baseDb, distanceFt) {
  const hard = baseDb - 3 * Math.log2(distanceFt / 50);
  const soft = baseDb - 4.5 * Math.log2(distanceFt / 50);

  return {
    hard,
    soft,
  };
}

// Calculate range of values based on distance
//
function buildRange(baseDb) {
  const distances = [100, 200, 300, 400, 500];

  return distances.map((d) => {
    const est = noiseEstimate(baseDb, d);
    return {
      distance: d,
      hard: est.hard.toFixed(1),
      soft: est.soft.toFixed(1),
    };
  });
}

// function to check null values for popups
function checkNull(properties, fields) {
  return fields
    .map((f) => {
      const val = Number(properties[f.key]);
      if (!Number.isFinite(val)) return ""; // don't return any blanks or empty values
      return `       
      <div class="map-popup-row">
        <span class="label">${f.label}:</span>
        <span class="value">${val.toLocaleString()}</span>
      </div>
      `;
    })
    .join("");
}

const roadFields = [
  { key: "LASTCNT", label: "AADT" },
  { key: "ADTSINGLE", label: "Single Trucks" },
  { key: "ADTCOMBO", label: "Combo Trucks" },
];

// keep track of icons currently being loaded
const loadingImages = new Set();

map.on("styleimagemissing", async (e) => {
  const id = e.id;

  if (id !== "/school.svg" && id !== "/library.svg") return;
  if (map.hasImage(id)) return;
  if (loadingImages.has(id)) return;

  loadingImages.add(id);

  try {
    const response = await fetch(id);
    if (!response.ok) throw new Error(`Failed to fetch ${id}`);

    const svgText = await response.text();
    const svgDataUrl =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);

    const image = new Image();
    image.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = svgDataUrl;
    });

    if (!map.hasImage(id)) {
      map.addImage(id, image);
    }

    // force a repaint once the image is added
    map.triggerRepaint();
  } catch (err) {
    console.error(`Error loading icon ${id}:`, err);
  } finally {
    loadingImages.delete(id);
  }
});

// allow popups/click events to happen for overlapping features
// in this case, for roads, build the popup from the tile attributes
// for noise polygons, build road popup but also allow for the noise polygon VALUE to work with legend
map.on("click", (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ["KYTC Traffic Counts", "Noise polygons"],
  });

  if (!features.length) return;

  const roadFeature = features.find(
    (f) => f.layer.id === "KYTC Traffic Counts",
  );

  const noiseFeature = features.find((f) => f.layer.id === "Noise polygons");

  // always let the noise polygon update the legend if present
  if (noiseFeature) {
    const value = Number(noiseFeature.properties?.VALUE);
    updateLegend(value);
  }

  // roads popup
  if (roadFeature) {
    const p = roadFeature.properties;

    let noiseHtml = "";
    if (noiseFeature) {
      const baseDb = Number(noiseFeature.properties?.VALUE);
      const rows = buildRange(baseDb);

      noiseHtml = `
        <div class="map-popup-divider"></div>
        <div class="map-popup-title">Estimated Noise Range</div>
        <div class="map-popup-subtitle">Estimate based on BTS mapped value and distance decay.</div>
        ${rows
          .map(
            (r) => `
          <div class="map-popup-row">
            <span class="label">${r.distance} ft:</span>
            <span class="value">${r.soft} - ${r.hard} dB</span>
          </div>
        `,
          )
          .join("")}
      `;
    }

    const propertyRows = checkNull(p, roadFields);

    new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      className: "popup",
    })
      .setLngLat(e.lngLat)
      .setHTML(
        `
          <div class="map-popup">
            <div class="map-popup-title">Traffic Counts</div>
            ${propertyRows}
            ${noiseHtml}
          </div>
        `,
      )
      .addTo(map);
  }
});

// popup for libraries
map.on("click", "libraries-symbol", (e) => {
  const f = e.features?.[0];
  if (!f) return;

  const name = f.properties?.Library_Name || "Library";

  new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    className: "popup",
  })
    .setLngLat(e.lngLat)
    .setHTML(
      `
      <div class="map-popup">
        <div class="map-popup-title">Library</div>
        <div class="map-popup-row">
          <span class="value">${name}</span>
        </div>
      </div>
    `,
    )
    .addTo(map);
});

// popup for schools
map.on("click", "schools-symbol", (e) => {
  const f = e.features?.[0];
  if (!f) return;

  const name = f.properties?.SCHNAME || "School";

  new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    className: "popup",
  })
    .setLngLat(e.lngLat)
    .setHTML(
      `
      <div class="map-popup">
        <div class="map-popup-title">School</div>
        <div class="map-popup-row">
          <span class="value">${name}</span>
        </div>
      </div>
    `,
    )
    .addTo(map);
});

// cursor for interactivity
const interactiveLayers = [
  "KYTC Traffic Counts",
  "Noise polygons",
  "libraries-symbol",
  "schools-symbol",
];

interactiveLayers.forEach((layer) => {
  map.on("mouseenter", layer, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", layer, () => {
    map.getCanvas().style.cursor = "";
  });
});

// Add basic map controls
map.addControl(new maplibregl.NavigationControl(), "top-right");
map.addControl(new maplibregl.FullscreenControl());
// add compact attribution (collapsed)
const attrib = new maplibregl.AttributionControl({
  compact: true,
  customAttribution: `
    <div>Noise estimates: Screened from BTS Mapped data and distance decay</div>
    <div>Traffic data: KYTC</div>
    <div>Raster: DOT Bureau of Transportation Statistics</div>
  `,
});

map.addControl(attrib, "bottom-right");

map.on("load", () => {
  const el = document.querySelector(".maplibregl-ctrl-attrib");
  if (el) {
    el.classList.remove("maplibregl-compact-show");
  }
});
