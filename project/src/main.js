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

map.on('click', 'Noise polygons', (e) => {
  const f = e.features?.[0];
  if (!f) return;

  const v = f.properties?.VALUE;
  const vRounded = (v ?? NaN);
  const pretty = Number.isFinite(vRounded) ? vRounded.toFixed(1) : 'N/A';

  new maplibregl.Popup({ closeButton: true, closeOnClick: true })
    .setLngLat(e.lngLat)
    .setHTML(`<div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
                <div style="font-weight:700; margin-bottom:4px;">Noise</div>
                <div><b>${pretty}</b> dB</div>
              </div>`)
    .addTo(map);
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
