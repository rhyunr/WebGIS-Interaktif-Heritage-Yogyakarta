// =============================================
// WebGIS Heritage Yogyakarta - app.js
// Leaflet + Routing + Sidebar Logic
// =============================================

let map;
let markersLayer;
let routeLayer;
let allFeatures = [];
let selectedMarker = null;
let currentFilter = 'semua';

const CATEGORY_COLORS = {
  keraton:      { color: '#D4A017', label: 'Peninggalan Keraton' },
  kolonial:     { color: '#C0C0C0', label: 'Peninggalan Kolonial' },
  pelestarian:  { color: '#A0522D', label: 'Keraton & Pelestarian' },
  religi:       { color: '#2E8B57', label: 'Religi' },
  modern:       { color: '#4169E1', label: 'Modern' }
};

const sidebar = document.getElementById('sidebar');

// ---- INIT MAP ----
function initMap() {
  map = L.map('map', {
    center: [-7.800, 110.366],
    zoom: 14,
    zoomControl: false
  });

  // Tile layer OpenStreetMap
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  });

  // Tile layer satelit (ESRI)
  const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri',
    maxZoom: 18
  });

  osmLayer.addTo(map);

  // Layer control
  const baseMaps = {
    "Peta Jalan": osmLayer,
    "Citra Satelit": satLayer
  };
  L.control.layers(baseMaps, {}, { position: 'topright', collapsed: true }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);

  // Load data
  loadHeritage();
}

// ---- LOAD DATA GEOJSON ----
function loadHeritage() {
  fetch('data/heritage.geojson')
    .then(res => res.json())
    .then(data => {
      allFeatures = data.features;
      renderMarkers(allFeatures);
      renderBuildingList(allFeatures);
      populateRouteDropdowns(allFeatures);

      // Sembunyikan loading
      setTimeout(() => {
        document.getElementById('loading-overlay').classList.add('hidden');
      }, 800);

      updateStatusBar(allFeatures.length);
    })
    .catch(err => {
      console.error('Error loading data:', err);
      document.getElementById('loading-overlay').classList.add('hidden');
    });
}

// ---- RENDER MARKER DI MAP ----
function renderMarkers(features) {
  markersLayer.clearLayers();

  features.forEach(feature => {
    const props = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;
    const catColor = CATEGORY_COLORS[props.kategori_id]?.color || '#D4A017';

    // Custom DivIcon
    const icon = L.divIcon({
      className: '',
      html: `
        <div class="custom-marker marker-${props.kategori_id}" style="border-color: ${catColor}">
          <span>${props.icon}</span>
        </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });

    const marker = L.marker([lat, lng], { icon });

    marker.bindPopup(`
      <div class="popup-title">${props.icon} ${props.name}</div>
      <div class="popup-kat">${props.kategori}</div>
      <div class="popup-desc">${props.deskripsi.substring(0, 100)}...</div>
    `, { maxWidth: 220 });

    marker.on('click', () => {
      showBuildingInfo(props);
      highlightListItem(props.id);
    });

    marker.featureId = props.id;
    markersLayer.addLayer(marker);
  });
}

// ---- RENDER DAFTAR BANGUNAN ----
function renderBuildingList(features) {
  const list = document.getElementById('building-list');
  list.innerHTML = '';

  features.forEach(feature => {
    const props = feature.properties;
    const catColor = CATEGORY_COLORS[props.kategori_id]?.color || '#D4A017';

    const item = document.createElement('div');
    item.className = 'building-item';
    item.dataset.id = props.id;
    item.innerHTML = `
      <div class="building-icon">${props.icon}</div>
      <div class="building-info">
        <h3>${props.name}</h3>
        <div class="kategori-tag" style="color: ${catColor}">${props.kategori}</div>
        <div class="tahun">Berdiri: ${props.tahun_berdiri}</div>
      </div>`;

    item.addEventListener('click', () => {
      flyToFeature(feature);
      showBuildingInfo(props);
      highlightListItem(props.id);
      switchTab('info');
    });

    list.appendChild(item);
  });
}

function filterByKategori(kategori) {
  currentFilter = kategori;

  // Update tombol filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.kat === kategori);
  });

  let filtered;
  if (kategori === 'semua') {
    filtered = allFeatures;
  } else {
    filtered = allFeatures.filter(f => f.properties.kategori_id === kategori);
  }

  renderMarkers(filtered);
  renderBuildingList(filtered);
}

// ---- FLY TO FITUR ----
function flyToFeature(feature) {
  const [lng, lat] = feature.geometry.coordinates;
  map.flyTo([lat, lng], 17, { duration: 1.2 });
}

// ---- TAMPILKAN INFO BANGUNAN ----
function showBuildingInfo(props) {
  const panel = document.getElementById('info-panel');
  if (!panel) return;
  panel.style.display = 'block';

  // Coba load gambar, fallback ke emoji
  let imgHtml = '';

if (Array.isArray(props.gambar)) {

  imgHtml = `
    <div class="info-image-container">
      <button class="slide-btn prev">❮</button>

      <img id="slider-img"
           src="${props.gambar[0]}"
           alt="${props.name}">

      <button class="slide-btn next">❯</button>
    </div>
  `;

  setTimeout(() => {
    let current = 0;

    const img = document.getElementById('slider-img');

    const prev = document.querySelector('.slide-btn.prev');
    const next = document.querySelector('.slide-btn.next');

    prev.onclick = () => {
      current =
        (current - 1 + props.gambar.length)
        % props.gambar.length;

      img.src = props.gambar[current];
    };

    next.onclick = () => {
      current =
        (current + 1)
        % props.gambar.length;

      img.src = props.gambar[current];
    };

  }, 100);

} else {

  imgHtml = `
    <div class="info-image-container">
      <img src="${props.gambar}" alt="${props.name}"
           onerror="this.parentElement.innerHTML='<div class=\\'info-image-placeholder\\'>${props.icon}</div>'">
    </div>`;
}

  panel.innerHTML = `
    ${imgHtml}
    <div class="info-nama">${props.name}</div>
    <div class="info-kategori">${props.kategori}</div>
    <table class="info-table">
      <tr><td>Status</td><td>${props.status}</td></tr>
      <tr><td>Berdiri</td><td>${props.tahun_berdiri}</td></tr>
      <tr><td>Luas</td><td>${props.luas}</td></tr>
    </table>
    <div class="info-deskripsi">${props.deskripsi}</div>
    <button class="btn-fokus" onclick="focusOnBuilding(${props.id})">
      📍 Tampilkan di Peta
    </button>
    <button class="btn-fokus" onclick="setRouteFrom(${props.id})" style="margin-top: 5px; border-color: #8B5E3C; color: #8B5E3C;">
      🚩 Jadikan Titik Awal Rute
    </button>`;
}

// ---- FOKUS KE BANGUNAN ----
function focusOnBuilding(id) {
  const feature = allFeatures.find(f => f.properties.id === id);
  if (feature) {
    flyToFeature(feature);
    // Buka popup
    markersLayer.eachLayer(layer => {
      if (layer.featureId === id) {
        layer.openPopup();
      }
    });
  }
}

// ---- HIGHLIGHT ITEM DI LIST ----
function highlightListItem(id) {
  document.querySelectorAll('.building-item').forEach(item => {
    item.classList.toggle('selected', parseInt(item.dataset.id) === id);
  });
}

// ---- SWITCH TAB ----
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });
}

// ---- POPULATE DROPDOWN RUTE ----
function populateRouteDropdowns(features) {
  const fromSel = document.getElementById('route-from');
  const toSel = document.getElementById('route-to');

  if (fromSel && toSel) {
    [fromSel, toSel].forEach(sel => {
      sel.innerHTML = '<option value="">-- Pilih Lokasi --</option>';
      features.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.properties.id;
        opt.textContent = `${f.properties.icon} ${f.properties.name}`;
        sel.appendChild(opt);
      });
    });
  }
}

// ---- SET RUTE DARI PANEL INFO ----
function setRouteFrom(id) {
  switchTab('rute');
  const routeFrom = document.getElementById('route-from');
  if (routeFrom) routeFrom.value = id;
}

// ---- HITUNG RUTE ----
function calculateRoute() {
  const routeFrom = document.getElementById('route-from');
  const routeTo = document.getElementById('route-to');
  if (!routeFrom || !routeTo) return;

  const fromId = parseInt(routeFrom.value);
  const toId = parseInt(routeTo.value);

  if (!fromId || !toId) {
    showRouteResult('⚠️ Pilih titik awal dan tujuan terlebih dahulu.', null);
    return;
  }

  if (fromId === toId) {
    showRouteResult('⚠️ Titik awal dan tujuan tidak boleh sama.', null);
    return;
  }

  const fromFeat = allFeatures.find(f => f.properties.id === fromId);
  const toFeat = allFeatures.find(f => f.properties.id === toId);

  const [lng1, lat1] = fromFeat.geometry.coordinates;
  const [lng2, lat2] = toFeat.geometry.coordinates;

  // Hitung jarak Haversine
  const dist = haversineDistance(lat1, lng1, lat2, lng2);
  const walkTime = Math.round(dist / 80); // ~80m/menit
  const driveTime = Math.round(dist / 400); // ~400m/menit

  // Gambar garis lurus di map
  routeLayer.clearLayers();

  const polyline = L.polyline([[lat1, lng1], [lat2, lng2]], {
    color: '#D4A017',
    weight: 3,
    opacity: 0.8,
    dashArray: '8, 6'
  });

  routeLayer.addLayer(polyline);

  // Titik awal/akhir
  const iconStart = L.divIcon({
    html: `<div style="background:#2E8B57;border:2px solid #fff;border-radius:50%;width:14px;height:14px;"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
  });
  const iconEnd = L.divIcon({
    html: `<div style="background:#C00;border:2px solid #fff;border-radius:50%;width:14px;height:14px;"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
  });

  routeLayer.addLayer(L.marker([lat1, lng1], { icon: iconStart }));
  routeLayer.addLayer(L.marker([lat2, lng2], { icon: iconEnd }));

  // Fit bounds
  map.fitBounds([[lat1, lng1], [lat2, lng2]], { padding: [60, 60] });

  showRouteResult(null, {
    from: fromFeat.properties.name,
    to: toFeat.properties.name,
    distance: dist,
    walkTime,
    driveTime
  });
}

// ---- HAVERSINE DISTANCE (meter) ----
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            /* Shadowing lat1 is okay here as it's an expression */
            Math.sin(dLng/2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// ---- TAMPILKAN HASIL RUTE ----
function showRouteResult(errorMsg, data) {
  const el = document.getElementById('route-result');
  if (!el) return;

  if (errorMsg) {
    el.innerHTML = `<span style="color:#C00">${errorMsg}</span>`;
    return;
  }

  const distStr = data.distance >= 1000
    ? `${(data.distance / 1000).toFixed(2)} km`
    : `${data.distance} m`;

  el.innerHTML = `
    <div class="result-item">
      <span class="result-label">Dari</span>
      <span class="result-value" style="font-size:10px; max-width:55%; text-align:right">${data.from}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Ke</span>
      <span class="result-value" style="font-size:10px; max-width:55%; text-align:right">${data.to}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Jarak</span>
      <span class="result-value">${distStr}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Jalan Kaki</span>
      <span class="result-value">~${data.walkTime} menit</span>
    </div>
    <div class="result-item">
      <span class="result-label">Berkendara</span>
      <span class="result-value">~${data.driveTime} menit</span>
    </div>`;
}

// ---- HAPUS RUTE ----
function clearRoute() {
  routeLayer.clearLayers();
  const routeResult = document.getElementById('route-result');
  const routeFrom = document.getElementById('route-from');
  const routeTo = document.getElementById('route-to');
  
  if (routeResult) routeResult.innerHTML = '<span style="color:#6B5B4E">Rute dihapus.</span>';
  if (routeFrom) routeFrom.value = '';
  if (routeTo) routeTo.value = '';
}

// ---- UPDATE STATUS BAR ----
function updateStatusBar(count) {
  const statusCount = document.getElementById('status-count');
  const statusZoom = document.getElementById('status-zoom');
  
  if (statusCount) statusCount.textContent = `${count} Situs`;
  if (statusZoom) statusZoom.textContent = `Zoom: ${map.getZoom()}`;
  
  map.on('zoomend', () => {
    if (statusZoom) statusZoom.textContent = `Zoom: ${map.getZoom()}`;
  });
}

// ---- MAP CONTROLS ----
function zoomIn() { map.zoomIn(); }
function zoomOut() { map.zoomOut(); }
function resetView() { map.flyTo([-7.800, 110.366], 14, { duration: 1 }); }

// ---- TOGGLE MODE 2D/3D ----
function toggleMode(mode) {
  const mapContainer = document.getElementById('map-container');
  const cesiumContainer = document.getElementById('cesium-container');
  const btnMap = document.getElementById('btn-2d');
  const btnCesium = document.getElementById('btn-3d');

  if (mode === '2d') {
    if (mapContainer) mapContainer.style.display = 'block';
    if (cesiumContainer) cesiumContainer.style.display = 'none';
    if (btnMap) btnMap.classList.add('active');
    if (btnCesium) btnCesium.classList.remove('active');
    if (sidebar) sidebar.classList.remove('closed');
  } else {
    if (mapContainer) mapContainer.style.display = 'none';
    if (cesiumContainer) cesiumContainer.style.display = 'block';
    if (btnMap) btnMap.classList.remove('active');
    if (btnCesium) btnCesium.classList.add('active');
    if (sidebar) sidebar.classList.add('closed');
    initCesium();
  }
}

// ---- INIT CESIUM (dipanggil sekali) ----
let cesiumInited = false;
function initCesium() {
  if (cesiumInited) return;
  cesiumInited = true;

  if (typeof Cesium === 'undefined') {
    const viewerEl = document.getElementById('cesiumViewer');
    if (viewerEl) {
      viewerEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:15px;background:#0D0D0D;color:#D4A017;font-family:Arial">
          <div style="font-size:40px">🗺️</div>
          <div style="font-size:14px;font-weight:bold">Cesium.js Belum Dimuat</div>
        </div>`;
    }
    return;
  }

  Cesium.Ion.defaultAccessToken = 'YOUR_CESIUM_ION_TOKEN_HERE';

  const viewer = new Cesium.Viewer('cesiumViewer', {
    terrainProvider: Cesium.createWorldTerrain(),
    baseLayerPicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    fullscreenButton: false
  });

  viewer.scene.globe.enableLighting = true;

  try {
    const osmBuildings = viewer.scene.primitives.add(
      new Cesium.Cesium3DTileset({
        url: Cesium.IonResource.fromAssetId(96188)
      })
    );
    osmBuildings.style = new Cesium.Cesium3DTileStyle({
      color: "color('rgba(139, 94, 60, 0.7)')"
    });
  } catch (e) {
    console.warn('OSM Buildings LOD2 tidak dapat dimuat:', e);
  }

  allFeatures.forEach(feature => {
    const props = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;

    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 50),
      billboard: {
        image: createBillboardCanvas(props.icon),
        width: 48,
        height: 48,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      },
      label: {
        text: props.name,
        font: 'bold 13px Arial',
        fillColor: Cesium.Color.fromCssColorString('#D4A017'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, 50),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000)
      }
    });
  });

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(110.366, -7.800, 3000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0.0
    },
    duration: 2
  });
}

// ---- BUAT CANVAS EMOJI UNTUK CESIUM BILLBOARD ----
function createBillboardCanvas(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = '40px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 32, 32);
  return canvas;
}

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  initMap();

  const toggleSidebar = document.getElementById('toggle-sidebar');
  if (toggleSidebar && sidebar) {
    toggleSidebar.onclick = () => {
      sidebar.classList.toggle('closed');
    };
  }
});

function startApp() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';

  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 300);
}