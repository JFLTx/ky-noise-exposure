import maplibregl from "maplibre-gl";
import "/src/style.css";
import "maplibre-gl/dist/maplibre-gl.css";

const map = new maplibregl.Map({
  container: "map",
  style: "/style.json",
  center: [-85.5, 37.6],
  zoom: 7,
  minZoom: 6,
  maxZoom: 16,
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

map.on("click", "KYTC Traffic Counts", (e) => {
  const f = e.features?.[0];
  if (!f) return;
  console.log(f.properties);
});

map.on("click", "Noise polygons", (e) => {
  const f = e.features?.[0];
  if (!f) return;

  const value = Number(f.properties?.VALUE);
  updateLegend(value);
});

map.on("click", "Noise polygons", (e) => {
  const f = e.features?.[0];
  if (!f) return;

  const value = Number(f.properties?.VALUE);
  updateLegend(value);
});

// cursor for interactivity
map.on("mouseenter", "Noise polygons", () => {
  map.getCanvas().style.cursor = "pointer";
});

map.on("mouseleave", "Noise polygons", () => {
  map.getCanvas().style.cursor = "";
});

// Add basic map controls
map.addControl(new maplibregl.NavigationControl(), "top-right");
map.addControl(new maplibregl.FullscreenControl());
map.addControl(
  new maplibregl.ScaleControl({
    maxWidth: 80,
    unit: "imperial",
  }),
);

// map.on("move", () => {
//   const center = map.getCenter();
//   console.log(
//     `Longitude: ${center.lng.toFixed(4)} Latitude: ${center.lat.toFixed(4)}`,
//   );
// });
