import maplibregl from "maplibre-gl";
import "./style.css";
import "maplibre-gl/dist/maplibre-gl.css";

// loading screen
const loadingScreen = document.getElementById("loading-screen");

// initialize maplibre map settings
const map = new maplibregl.Map({
  container: "map",
  style: "./style.json",
  center: [-85.5, 37.6],
  zoom: 7,
  minZoom: 6,
  maxZoom: 16,
  attributionControl: false,
});

// hide the loading screen once data loads
// also open the info modal so users know what the map is about
map.once("idle", () => {
  loadingScreen.classList.add("hidden");

  setTimeout(() => {
    infoModal.classList.remove("hidden");
    infoModal.setAttribute("aria-hidden", "false");
    infoActive = true;
  }, 300);
});

// set a zoom function for the map
function zoomTo() {
  map.fitBounds(
    [
      [-89.57, 36.5], // SW Corner of Kentucky
      [-81.97, 38.94], // NE Corner of Kentucky Extent
    ],
    {
      padding: 75,
      duration: 1000,
      maxZoom: 14,
    },
  );
}

// set variables to min and max noise levels in map
const min = 45;
const max = 124;
const warningVal = 55; // value for EPA standard,

// set variables to access elements in HTML
const indicator = document.getElementById("heatmap-indicator");
const readout = document.getElementById("heatmap-readout");
const minZoom = 10; // min zoom level for noise polygon interactivity

// hoverPopup for our SVG symbols
// differentiated from a click logic
const hoverPopup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false,
  className: "popup",
  offset: 12,
});

// custom infocontrol class matching/targeting MapLibre's control group settings
class InfoControl {
  onAdd(map) {
    this._map = map;

    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "maplibregl-ctrl-icon info-control-button";
    button.setAttribute("aria-label", "Map information");
    button.setAttribute("title", "Map information");
    button.innerHTML = "?";

    button.addEventListener("click", (e) => {
      e.stopPropagation();
      infoModal.classList.remove("hidden");
      infoModal.setAttribute("aria-hidden", "false");

      // resume once the info button opens
      document.querySelectorAll(".info-video").forEach((v) => {
        v.play();
      });
    });

    container.appendChild(button);
    this._container = container;

    return container;
  }

  onRemove() {
    this._container?.remove();
    this._map = undefined;
  }
}

// legend and layer control in a button similar to the info control
// all of the legend details and details will be added here
class LayerControl {
  onAdd(map) {
    this._map = map;

    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group layer-control";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "maplibregl-ctrl-icon layer-control-button";
    button.setAttribute("aria-label", "Layer list");
    button.setAttribute("title", "Layer list");
    button.innerHTML = "☰";

    const panel = document.createElement("div");
    panel.className = "layer-panel hidden";

    panel.innerHTML = `
      <div class="layer-panel-title">Layers</div>
      <div class="layer-list"></div>
    `;

    const layerList = panel.querySelector(".layer-list");

    // list of layer groups
    // Layers accesses each unique layer in style.json
    // Label groups all the layers under the label for toggling on/off everything in each layerGroup's layers
    // swatchIcon matches an existing swatch to either an svg or CSS rule
    const layerGroups = [
      {
        label: "Schools",
        layers: ["schools-symbol"],
        swatchType: "icon",
        swatchIcon: "./school.svg",
      },
      {
        label: "Libraries",
        layers: ["libraries-symbol"],
        swatchType: "icon",
        swatchIcon: "./library.svg",
      },
      {
        label: "Airports",
        layers: ["airports-symbol", "runway-outline", "runway-fill"],
        swatchType: "icon",
        swatchIcon: "./airplane.svg",
      },
      {
        label: "KYTC Traffic Counts",
        layers: ["KYTC Traffic Glow", "KYTC Traffic Counts"],
        swatchType: "line",
        swatchClass: "swatch-traffic-line",
      },
      {
        label: "AADT Exposure Contours",
        layers: ["AADT Exposure Contours", "AADT Exposure Contour Labels"],
        swatchType: "contours",
      },
      {
        label: "Noise Raster",
        layers: ["Noise"],
        swatchType: "gradient",
      },
      {
        label: "Industrial Sites",
        layers: [
          "industrial-sites-fill",
          "industrial-glow-mid",
          "industrial-outline-core",
          "Industrial Sites Labels",
        ],
        swatchType: "fill",
        swatchClass: "swatch-industrial",
      },
      {
        label: "Parks",
        layers: ["KY Parks Fill", "KY Parks Outline", "KY Parks Labels"],
        swatchType: "fill",
        swatchClass: "swatch-parks",
      },
      {
        label: "Building",
        layers: ["Building"],
        swatchType: "fill",
        swatchClass: "swatch-building",
      },
      {
        label: "APP Census Tracts",
        layers: ["APP Census Tracts Fill", "APP Census Tracts Outline"],
        swatchType: "app-classes",
      },
    ];

    function firstLayer(groupLayers) {
      return groupLayers.find((id) => map.getLayer(id));
    }

    function visible(groupLayers) {
      const visibleLayer = firstLayer(groupLayers);
      if (!visibleLayer) return true;
      return map.getLayoutProperty(visibleLayer, "visibility") !== "none";
    }

    function setVisibility(groupLayers, isVisible) {
      groupLayers.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(
            id,
            "visibility",
            isVisible ? "visible" : "none",
          );
        }
      });
    }

    // function that controls how each individual or special swatch is constructed
    function buildSwatch(group) {
      const swatch = document.createElement("span");
      swatch.className = "layer-swatch";

      if (group.swatchType === "icon") {
        swatch.classList.add("layer-swatch-icon");
        const img = document.createElement("img");
        img.src = group.swatchIcon;
        img.alt = "";
        img.className = "layer-swatch-svg";
        swatch.appendChild(img);
        return swatch;
      }

      if (group.swatchType === "gradient") {
        swatch.classList.add("layer-swatch-gradient");
        return swatch;
      }

      if (group.swatchType === "line") {
        swatch.classList.add("layer-swatch-line-wrap");
        swatch.innerHTML = `<span class="layer-swatch-line ${group.swatchClass}"></span>`;
        return swatch;
      }

      if (group.swatchType === "contours") {
        swatch.classList.add("layer-swatch-contours");
        swatch.innerHTML = `
          <span class="contour-line contour-100"></span>
          <span class="contour-line contour-200"></span>
          <span class="contour-line contour-300"></span>
          <span class="contour-line contour-400"></span>
          <span class="contour-line contour-500"></span>
        `;
        return swatch;
      }

      if (group.swatchType === "app-classes") {
        swatch.classList.add("layer-swatch-line-wrap");
        swatch.innerHTML = `<span class="layer-swatch-line swatch-app-outline"></span>`;
        return swatch;
      }

      swatch.classList.add(group.swatchClass);
      return swatch;
    }

    layerGroups.forEach((group) => {
      const row = document.createElement("label");
      row.className = "layer-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;

      checkbox.addEventListener("change", () => {
        setVisibility(group.layers, checkbox.checked);
      });

      const swatch = buildSwatch(group);

      const textWrap = document.createElement("span");
      textWrap.className = "layer-row-text";

      const text = document.createElement("span");
      text.className = "layer-row-label";
      text.textContent = group.label;
      textWrap.appendChild(text);

      if (group.swatchType === "app-classes") {
        const breakdown = document.createElement("div");
        breakdown.className = "layer-row-sublegend app-sublegend";
        breakdown.innerHTML = `
          <div class="app-sublegend-title">% Area Noise-Exposed</div>
          <div class="app-sublegend-row">
            <span class="app-sublegend-swatch app-low"></span>
            <span>0–10%</span>
          </div>
          <div class="app-sublegend-row">
            <span class="app-sublegend-swatch app-midlow"></span>
            <span>10–25%</span>
          </div>
          <div class="app-sublegend-row">
            <span class="app-sublegend-swatch app-midhigh"></span>
            <span>25–50%</span>
          </div>
          <div class="app-sublegend-row">
            <span class="app-sublegend-swatch app-high"></span>
            <span>>50%</span>
          </div>
        `;
        textWrap.appendChild(breakdown);
      }

      row.appendChild(checkbox);
      row.appendChild(swatch);
      row.appendChild(textWrap);
      layerList.appendChild(row);

      group.checkbox = checkbox;
    });

    const syncCheckboxes = () => {
      layerGroups.forEach((group) => {
        if (group.checkbox) {
          group.checkbox.checked = visible(group.layers);
        }
      });
    };

    button.addEventListener("click", (e) => {
      e.stopPropagation();
      syncCheckboxes();
      panel.classList.toggle("hidden");
    });

    map.on("load", syncCheckboxes);
    map.on("styledata", syncCheckboxes);

    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        panel.classList.add("hidden");
      }
    });

    container.appendChild(button);
    container.appendChild(panel);

    this._container = container;
    return container;
  }

  onRemove() {
    this._container?.remove();
    this._map = undefined;
  }
}

// info button and modal wiring
const infoModal = document.getElementById("info-modal");
const infoClose = document.getElementById("info-close");
let infoActive = false; // set tracking on whether the info button has been closed after inital map load

// Set a function to the info close
// Updates the status on infoActive to true (the user has closed the window once
// zoomTo() only fires if infoActive = true
function closeInfo() {
  infoModal.classList.add("hidden");
  infoModal.setAttribute("aria-hidden", "true");

  // pause video when info is closed
  document.querySelectorAll(".info-video").forEach((v) => {
    v.pause();
    v.currentTime = 0;
  });

  if (infoActive) {
    zoomTo();
    infoActive = false;
  }
}

infoClose.addEventListener("click", closeInfo);

infoModal.addEventListener("click", (e) => {
  if (e.target === infoModal) {
    closeInfo();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeInfo();
  }
});

// demo video functionality adding full-screen viewing option
const demoVideo = document.getElementById("demo-video");

if (demoVideo) {
  demoVideo.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) return;
      await demoVideo.requestFullscreen();
    } catch (err) {
      console.error("Could not enter fullscreen:", err);
    }
  });
}

// noise level indicator is not showing once the map loads
map.on("load", () => {
  indicator.style.opacity = "0";
  setPrompt();
});

// Set the prompt from "Zoom to Explore" to "Click Map" when zoomed in
map.on("zoom", setPrompt);

// Reset from "Click Map"/clicked VALUE to "Zoom to Explore" when zoomed out
map.on("zoomend", () => {
  if (map.getZoom() < minZoom) {
    resetPrompt();
  } else if (indicator.style.opacity === "0" || !indicator.style.opacity) {
    setPrompt();
  }
});

// set a function on zoom to change heatmap-readout property
// matches the minZoom value
// THis clears confusion about map interactivity capabilities
function setPrompt() {
  const z = map.getZoom();

  // only change the prompt when no noise value is currently active
  if (!indicator.style.opacity || indicator.style.opacity === "0") {
    readout.textContent = z >= minZoom ? "Click Map" : "Zoom to Explore";
  }
}

// reset the prompt
function resetPrompt() {
  indicator.style.opacity = "0";
  readout.classList.remove("warning-level");
  indicator.classList.remove("warning-level");
  setPrompt();
}

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

  readout.classList.toggle("warning-level", warning(clamped));
  indicator.classList.toggle("warning-level", warning(clamped));
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

// helper function to show warning levels in a different style
// gives the user a visual reference to see what is "bad" per EPA standards
function warning(value) {
  return Number.isFinite(value) && value >= warningVal;
}

function noiseVal(value) {
  return warning(value) ? "value warning-level" : "value";
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

// road field names for popup
const roadFields = [
  { key: "LASTCNT", label: "AADT" },
  { key: "ADTSINGLE", label: "Single Trucks" },
  { key: "ADTCOMBO", label: "Combo Trucks" },
];

// keep track of icons currently being loaded
const loadingImages = new Set();

map.on("styleimagemissing", async (e) => {
  const id = e.id;

  if (
    id !== "./school.svg" &&
    id !== "./library.svg" &&
    id !== "./airplane.svg"
  )
    return;
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

// calculate the ratio of noise-exposed area to total area for Census Tracts
function tractRatio(properties) {
  const sqMiles = Number(properties?.Sq_Miles);
  const noiseSqMiles = Number(properties?.NoiseSensitive_SqMiles);

  if (!Number.isFinite(sqMiles) || sqMiles <= 0) return null;
  if (!Number.isFinite(noiseSqMiles)) return null;

  return (noiseSqMiles / sqMiles) * 100;
}

// Popup information for census tracts
function appTractHtml(properties) {
  if (!properties) return "";

  const tractId = properties?.Tract_FIPS ?? "N/A";
  const pop2020 = Number(properties?.Pop2020);
  const sqMiles = Number(properties?.Sq_Miles);
  const noiseResidences = Number(properties?.NoiseSensitive_Residence_Count);
  const pctNoiseExposed = tractRatio(properties);

  return `
    <div class="map-popup-divider"></div>
    <div class="map-popup-title">APP Census Tract</div>
    <div class="map-popup-row">
      <span class="label">Census Tract ID:</span>
      <span class="value">${tractId}</span>
    </div>
    <div class="map-popup-row">
      <span class="label">2020 Census Population:</span>
      <span class="value">${
        Number.isFinite(pop2020) ? pop2020.toLocaleString() : "N/A"
      }</span>
    </div>
    <div class="map-popup-row">
      <span class="label">Total Area (mi&sup2;):</span>
      <span class="value">${
        Number.isFinite(sqMiles) ? sqMiles.toFixed(2) : "N/A"
      }</span>
    </div>
    <div class="map-popup-row">
      <span class="label">Pct. Noise-Exposed Area:</span>
      <span class="value">${
        pctNoiseExposed !== null ? pctNoiseExposed.toFixed(1) + "%" : "N/A"
      }</span>
    </div>
    <div class="map-popup-row">
      <span class="label">Est. Noise-Exposed Residences:</span>
      <span class="value">${
        Number.isFinite(noiseResidences)
          ? noiseResidences === 0
            ? "Unknown"
            : noiseResidences.toLocaleString()
          : "N/A"
      }</span>
    </div>
  `;
}

// defined HTML logic for hover popup
function hoverHtml(title, value) {
  return `
    <div class="map-popup">
      <div class="map-popup-title">${title}</div>
      <div class="map-popup-row">
        <span class="value">${value}</span>
      </div>
    </div>
  `;
}

// allow popups/click events to happen for overlapping features
// in this case, for roads, build the popup from the tile attributes
// for noise polygons, build road popup but also allow for the noise polygon VALUE to work with legend
map.on("click", (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ["KYTC Traffic Counts", "Noise polygons", "APP Census Tracts Fill"],
  });

  const roadFeature = features.find(
    (f) => f.layer.id === "KYTC Traffic Counts",
  );

  const noiseFeature = features.find((f) => f.layer.id === "Noise polygons");

  const appFeature = features.find(
    (f) => f.layer.id === "APP Census Tracts Fill",
  );

  // always let the noise polygon update the legend if data is present
  if (noiseFeature) {
    const value = Number(noiseFeature.properties?.VALUE);
    updateLegend(value);
  } else {
    indicator.style.opacity = "0";
    readout.textContent = "No Noise Data"; // handle no data for user click
    readout.classList.remove("warning-level");
    indicator.classList.remove("warning-level");
  }

  const appHtml = appFeature ? appTractHtml(appFeature.properties) : "";

  // if roadway clicked, build roadway popup and append APP tract info if present
  if (roadFeature) {
    const p = roadFeature.properties;

    let noiseHtml = "";
    if (noiseFeature) {
      const baseDb = Number(noiseFeature.properties?.VALUE);
      const rows = buildRange(baseDb);
      const mappedValue = Number.isFinite(baseDb) ? baseDb.toFixed(1) : null;

      noiseHtml = `
        <div class="map-popup-divider"></div>
        <div class="map-popup-title">Estimated Noise Range</div>
        <div class="map-popup-subtitle">Estimate based on BTS mapped value & distance decay. Estimates may greatly vary from clicked mapped values.</div><br>
        ${
          mappedValue
            ? `
              <div class="map-popup-row">
                <span class="label">BTS mapped value:</span>
                <span class="${noiseVal(baseDb)}">${mappedValue} dB</span>
              </div>
            `
            : ""
        }
        ${rows
          .map(
            (r) => `
          <div class="map-popup-row">
            <span class="label">${r.distance} ft decay:</span>
            <span class="${
              warning(Number(r.soft)) || warning(Number(r.hard))
                ? "value warning-level"
                : "value"
            }">
              ${r.soft} - ${r.hard} dB
            </span>
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
          ${appHtml}
        </div>
      `,
      )
      .addTo(map);

    return;
  }

  // if no roadway but APP tract clicked, show tract popup by itself
  if (appFeature) {
    new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      className: "popup",
    })
      .setLngLat(e.lngLat)
      .setHTML(
        `
        <div class="map-popup">
          ${appHtml.replace(`<div class="map-popup-divider"></div>`, "")}
        </div>
      `,
      )
      .addTo(map);

    return;
  }
});

// cursor for interactivity
const interactiveLayers = [
  "KYTC Traffic Counts",
  "Noise polygons",
  "APP Census Tracts Fill",
  "libraries-symbol",
  "schools-symbol",
  "airports-symbol",
];

const hoverLayers = {
  "schools-symbol": {
    title: "School",
    field: "SCHNAME",
    fallback: "School",
  },
  "libraries-symbol": {
    title: "Library",
    field: "Library_Name",
    fallback: "Library",
  },
  "airports-symbol": {
    title: "Airport",
    field: "FacilityNa",
    fallback: "Airport",
  },
};

Object.entries(hoverLayers).forEach(([layerId, config]) => {
  map.on("mouseenter", layerId, (e) => {
    map.getCanvas().style.cursor = "pointer";

    const f = e.features?.[0];
    if (!f) return;

    const name = f.properties?.[config.field] || config.fallback;

    hoverPopup
      .setLngLat(e.lngLat)
      .setHTML(hoverHtml(config.title, name))
      .addTo(map);
  });

  map.on("mousemove", layerId, (e) => {
    hoverPopup.setLngLat(e.lngLat);
  });

  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
    hoverPopup.remove();
  });
});

// Add basic map controls
map.addControl(new maplibregl.NavigationControl(), "top-right");
map.addControl(new maplibregl.FullscreenControl());
// add compact attribution (collapsed)
const attrib = new maplibregl.AttributionControl({
  compact: true,
  customAttribution: `
    <div>KYTC | USDOT Bureau of Transportation Statistics | KYGovMaps Open Data Portal</div>
  `,
});
// custom layer control added to map
map.addControl(new LayerControl(), "top-right");

// custom info control group
map.addControl(new InfoControl(), "top-right");

map.addControl(attrib, "bottom-right");

map.on("load", () => {
  const el = document.querySelector(".maplibregl-ctrl-attrib");
  if (el) {
    el.classList.remove("maplibregl-compact-show");
  }
});
