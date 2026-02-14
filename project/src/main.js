import maplibregl from "maplibre-gl";
import "/src/style.css";
import "maplibre-gl/dist/maplibre-gl.css";

// import maptiler key so it is not exposed
// const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
// const baseStyleUrl = `https://api.maptiler.com/maps/019c5d5d-06b2-70c4-8771-110800224358/style.json?key=${MAPTILER_KEY}`;

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const MAPTILER_STYLE = `https://api.maptiler.com/maps/019c5d5d-06b2-70c4-8771-110800224358/style.json?key=${MAPTILER_KEY}`;

const map = new maplibregl.Map({
  container: "map",
  style: MAPTILER_STYLE,
  center: [-85.5, 37.6],
  zoom: 8,
  minZoom: 7,
  maxZoom: 18,
});

map.on("load", () => {
  map.addSource("ky-noise", {
    type: "raster",
    tiles: [
      "https://tiles.arcgis.com/tiles/GfBANWpVjDJnX8Qz/arcgis/rest/services/ky_transportation_noise/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
    minzoom: 7,
    maxzoom: 16,
  });

  // put it on top of everything
  map.addLayer({
    id: "noise",
    type: "raster",
    source: "ky-noise",
    paint: { "raster-opacity": 1 },
  });
});

// Add basic map controls
map.addControl(new maplibregl.NavigationControl(), "top-right");
map.addControl(new maplibregl.FullscreenControl());
map.addControl(
  new maplibregl.ScaleControl({
    maxWidth: 80,
    unit: "imperial",
  })
);

map.on("move", () => {
  const center = map.getCenter();
  console.log(
    `Longitude: ${center.lng.toFixed(4)} Latitude: ${center.lat.toFixed(4)}`
  );
});
