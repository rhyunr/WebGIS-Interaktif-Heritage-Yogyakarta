/* =========================================
LOAD MAP
========================================= */

const map = L.map('map',{
  center:[-7.800,110.366],
  zoom:14
});

/* =========================================
TILE
========================================= */

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
  attribution:'© OpenStreetMap'
}
).addTo(map);

/* =========================================
LOAD GEOJSON
========================================= */

fetch('./heritage.geojson')

.then(res=>res.json())

.then(data=>{

  renderData(data.features);

});

/* =========================================
RENDER
========================================= */

function renderData(features){

  const buildingList =
  document.getElementById('building-list');

  features.forEach(feature=>{

    const props =
    feature.properties;

    const [lng,lat] =
    feature.geometry.coordinates;

    /* MARKER */

    const marker =
    L.marker([lat,lng]).addTo(map);

    marker.bindPopup(`
      <b>${props.icon} ${props.name}</b>
      <br>
      ${props.kategori}
    `);

    marker.on('click',()=>{

      showInfo(props);

    });

    /* SIDEBAR */

    const item =
    document.createElement('div');

    item.className =
    'building-item';

    item.innerHTML = `

      <div class="building-title">
        ${props.icon} ${props.name}
      </div>

      <div class="building-category">
        ${props.kategori}
      </div>

    `;

    item.onclick = ()=>{

      map.flyTo([lat,lng],17);

      showInfo(props);

    };

    buildingList.appendChild(item);

  });

}

/* =========================================
SHOW INFO
========================================= */

function showInfo(props){

  const panel =
  document.getElementById('info-panel');

  panel.innerHTML = `

    <img
    class="info-image"
    src="${props.gambar}">

    <div class="info-title">
      ${props.name}
    </div>

    <div class="info-desc">
      ${props.deskripsi}
    </div>

  `;
}
