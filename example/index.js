import mapboxgl from 'mapbox-gl';
import MapboxAdminBoundaryControl from '../dist/index';
import '../css/styles.css';

(()=>{
    const map = new mapboxgl.Map({
        container: 'map',
        // style: 'mapbox://styles/mapbox/streets-v11',
        style:'https://wasac.github.io/mapbox-stylefiles/unvt/style.json',
        center: [30.0291, -2.0032],
        zoom: 12,
        hash:true,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new MapboxAdminBoundaryControl(
        'https://wasac.github.io/rw-admin-boundary'
    ), 'top-right');

})()