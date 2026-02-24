import maplibregl from "maplibre-gl";
import "/src/style.css";
import "maplibre-gl/dist/maplibre-gl.css";

// import maptiler key so it is not exposed
// const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
// const baseStyleUrl = `https://api.maptiler.com/maps/019c5d5d-06b2-70c4-8771-110800224358/style.json?key=${MAPTILER_KEY}`;

// const mapTiler = `https://api.maptiler.com/maps/019c5d5d-06b2-70c4-8771-110800224358/style.json?key=VR7FKTd6lXA4PKRQVzfY`;

const map = new maplibregl.Map({
  container: "map",
  style: "/style.json",
  center: [-85.5, 37.6],
  zoom: 7,
  minZoom: 6,
  maxZoom: 16,
});

// map.on("load", () => {
//   map.addSource("ky-noise", {
//     type: "raster",
//     tiles: [
//       "https://tiles.arcgis.com/tiles/GfBANWpVjDJnX8Qz/arcgis/rest/services/ky_transportation_noise/MapServer/tile/{z}/{y}/{x}",
//     ],
//     tileSize: 256,
//     minzoom: 7,
//     maxzoom: 16,
//   });

//   // put it on top of everything
//   map.addLayer({
//     id: "noise",
//     type: "raster",
//     source: "ky-noise",
//     paint: { "raster-opacity": 1 },
//   });
//   map.addSource("khc-cemeteries", {
//     type: "vector",
//     tiles: [
//       "https://tiles.arcgis.com/tiles/GfBANWpVjDJnX8Qz/arcgis/rest/services/khc_cemeteries/VectorTileServer/tile/{z}/{y}/{x}.pbf"
//     ],
//     minzoom: 11,
//     maxzoom: 17,
//     tileSize: 512 // important: your service uses 512 tiles
//   });

//   map.addLayer({
//     id: "cemetery-fill",
//     type: "fill",
//     source: "khc-cemeteries",
//     "source-layer": CEM_SOURCE_LAYER,
//     minzoom: 11,
//     paint: {
//       "fill-color": "#1A2B1F",
//       "fill-opacity": 0.6
//     }
//   });

//   map.addLayer({
//     id: "cemetery-outline",
//     type: "line",
//     source: "khc-cemeteries",
//     "source-layer": CEM_SOURCE_LAYER,
//     minzoom: 11,
//     paint: {
//       "line-color": "#4C7A5A",
//       "line-width": 0.5,
//       "line-opacity": 0.7
//     }
//   });
// });

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
