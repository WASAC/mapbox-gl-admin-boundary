import axios from "axios";
import { IControl, Map as MapboxMap } from "mapbox-gl";

/**
 * Adds area switcher.
 * @param {Object} options
 * @param {Array} [options.area] - Array of area objects:
 * @param {String} options.area.label - Area label to display on switcher
 * @param {String} options.area.latlng - Latitude and Longitude to display
 * @param {String} options.area.zoom - Zoom level to display
 * @param {Function} [options.onChange] - Triggered on area change. Accepts `area` object
 */

export default class MapboxAdminBoundaryControl implements IControl
{
    private url: string;
    // private boundaryNames: string[];

    private adminList: { [key:string] : GeoJSON.FeatureCollection} = {};  

    private controlContainer: HTMLElement;
    private map?: MapboxMap;
    private mainContainer: HTMLElement;
    private mainButton: HTMLButtonElement;

    constructor(url: string,)
    {
        this.url = url ;
        // this.boundaryNames = boundaryNames;
        this.onDocumentClick = this.onDocumentClick.bind(this);
    }

    public getDefaultPosition(): string
    {
        const defaultPosition = "top-right";
        return defaultPosition;
    }

    public onAdd(map: MapboxMap): HTMLElement
    {
        this.map = map;

        this.map.on('load', function() {
          map.addSource('selected-boundary', { type: 'geojson', data: {
            'type': 'FeatureCollection',
            'features': []
          } });
          map.addLayer({
            'id': 'selected-boundary',
            'type': 'fill',
            'source': 'selected-boundary',
            'paint': {
              'fill-color': 'rgba(255, 0, 0, 1)',
              'fill-outline-color': 'rgba(255, 0, 0, 1)',
              'fill-opacity': 0.1
            },
            'filter': ['==', '$type', 'Polygon']
          });
        })

        this.controlContainer = document.createElement("div");
        this.controlContainer.classList.add("mapboxgl-ctrl");
        this.controlContainer.classList.add("mapboxgl-ctrl-group");
 
        this.mainContainer = document.createElement("div");
        this.mainContainer.classList.add("mapboxgl-admin-list");
        this.mainButton = document.createElement("button");
        this.mainButton.classList.add("mapboxgl-ctrl-icon");
        this.mainButton.classList.add("mapboxgl-admin-boundary-control");
        this.mainButton.addEventListener("click", () => {
            this.mainButton.style.display = "none";
            this.mainContainer.style.display = "block";

            var visibility = this.map?.getLayoutProperty(
              'selected-boundary',
              'visibility'
            );
            if (visibility !== 'visible') {
              this.map?.setLayoutProperty(
                'selected-boundary',
                'visibility',
                'visible'
              );
            }
        });
        document.addEventListener("click", this.onDocumentClick);
        this.controlContainer.appendChild(this.mainButton);
        this.controlContainer.appendChild(this.mainContainer);

        const table = document.createElement('TABLE');
        table.className = 'mapboxgl-admin-boundary-table';
        this.mainContainer.appendChild(table);

        const province = this.createSelection('province','Province');
        const district = this.createSelection('district','District');
        const sector = this.createSelection('sector','Sector');
        const cell = this.createSelection('cell','Cell');
        const village = this.createSelection('village','Village');
        
        table.appendChild(province.tr);
        table.appendChild(district.tr);
        table.appendChild(sector.tr);
        table.appendChild(cell.tr);
        table.appendChild(village.tr);

        this.getProvinces(province.content);

        province.content.addEventListener('change', (event: any) => {
          const id = event.target.value;
          const geojson: GeoJSON.FeatureCollection = this.adminList['province'];
          this.zoomToSelectedFeature(geojson, id);
          this.getDistricts().then((selectedId:string)=>{
            this.changeSelectVisibility('district','province');
            this.changeSelectVisibility('sector','district');
            this.changeSelectVisibility('cell','sector');
            this.changeSelectVisibility('village','cell');
          });
          this.changeSelectVisibility('district','province');
          this.changeSelectVisibility('sector','district');
          this.changeSelectVisibility('cell','sector');
          this.changeSelectVisibility('village','cell');
        });

        district.content.addEventListener('change', (event: any) => {
          const id = event.target.value;
          const geojson: GeoJSON.FeatureCollection = this.adminList['district'];
          console.log('district',id)
          this.zoomToSelectedFeature(geojson, id);
          this.getSectors().then((selectedId:string)=>{
            this.changeSelectVisibility('sector','district');
          this.changeSelectVisibility('cell','sector');
          this.changeSelectVisibility('village','cell');
          });
          this.changeSelectVisibility('sector','district');
          this.changeSelectVisibility('cell','sector');
          this.changeSelectVisibility('village','cell');
        });

        sector.content.addEventListener('change', (event: any) => {
          const id = event.target.value;
          const geojson: GeoJSON.FeatureCollection = this.adminList['sector'];
          this.zoomToSelectedFeature(geojson, id);
          console.log('sector',id)
          this.getCells().then(()=>{
            this.changeSelectVisibility('cell','sector');
          this.changeSelectVisibility('village','cell');
          });
          this.changeSelectVisibility('cell','sector');
          this.changeSelectVisibility('village','cell');
        });

        cell.content.addEventListener('change', (event: any) => {
          const id = event.target.value;
          const geojson: GeoJSON.FeatureCollection = this.adminList['cell'];
          console.log('cell',id)
          this.zoomToSelectedFeature(geojson, id);
          this.getVillages().then(()=>{
            this.changeSelectVisibility('village','cell');
          });
          this.changeSelectVisibility('village','cell');
          
        });

        village.content.addEventListener('change', (event: any) => {
          const id = event.target.value;
          const geojson: GeoJSON.FeatureCollection = this.adminList['village'];
          this.zoomToSelectedFeature(geojson, id);
        });

        return this.controlContainer;
    }

    private createSelection(
      id: string,
      title: string,
    ){  
      let content = document.createElement('select');
      content.setAttribute('id', `mapbox-gl-admin-select-${id}`);
      content.classList.add('mapboxgl-ctrl-admin-boundary')
      content.style.width = '100%';

      if (id !== 'province'){
        content.style.display = 'none';
      }else{
        content.style.display = 'inline';
      }

      content = this.setSelectItems(content, id, title);

      const tr = document.createElement('TR');
      const tdContent = document.createElement('TD');
      tdContent.appendChild(content);
      tr.appendChild(tdContent);
      return {tr, content};
    };

    private setSelectItems(select: HTMLSelectElement, id: string, title: string, geojson?: GeoJSON.FeatureCollection){
      select.innerHTML = "";

      const defaultOptionLayout = document.createElement('option');
      defaultOptionLayout.setAttribute('value', "");
      defaultOptionLayout.appendChild(document.createTextNode(`Select ${title}`));
      defaultOptionLayout.setAttribute('name', id);
      defaultOptionLayout.selected = true;
      select.appendChild(defaultOptionLayout);

      if (geojson) {
        geojson.features.forEach((f: GeoJSON.Feature) =>{
          const optionLayout = document.createElement('option');
          optionLayout.setAttribute('value', f.properties?.id);
          optionLayout.appendChild(document.createTextNode(`${f.properties?.id}: ${f.properties?.name}`));
          optionLayout.setAttribute('name', id);
          select.appendChild(optionLayout);
        })
      }
      return select;
    }

    private changeSelectVisibility(id: string, parentId: string) {
      const parent: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-${parentId}`); 
      const target : HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-${id}`); 
      if (parent.value === ""){
        target.style.display = 'none';
      }else{
        target.style.display = 'inline';
      }
    }

    private changeSelectDisabled(id: string, value:boolean) {
      const target : HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-${id}`); 
      if (!target) return;
      target.disabled = value;
    }

    private zoomToSelectedFeature(geojson: GeoJSON.FeatureCollection, id: number){
      for (let i = 0; i < geojson.features.length; i++){
        const f = geojson.features[i];
        if (f.properties?.id == id){
          // @ts-ignore
          this.map?.fitBounds(f.bbox);
          // @ts-ignore
          this.map?.getSource('selected-boundary').setData({
              'type': 'FeatureCollection',
              'features': [
                {
                  'type': 'Feature',
                  'geometry': f.geometry
                }
              ]
            }
          );
          break;
        }
      }
    }

    private setSelectedValue(id: string, title: string, value?: string): void {
      const select: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-${id}`); 
      if (!select) return;
      // select.value = value?value:'';
      this.setSelectItems(select, id, title);
    }

    private getProvinces(select: HTMLSelectElement){
      this.setSelectedValue('district', 'District');
      this.setSelectedValue('sector','Sector');
      this.setSelectedValue('cell', 'Cell');
      this.setSelectedValue('village', 'Village');

      this.changeSelectDisabled('province', false);
      this.changeSelectDisabled('district', false);
      this.changeSelectDisabled('sector', true);
      this.changeSelectDisabled('cell', true);
      this.changeSelectDisabled('village', true);

      const url = `${this.url}/province.geojson`;
      return new Promise<any>((resolve: (value?: any) => void, reject: (reason?: any) => void) => {
        axios.get(url).then(res => {
          const geojson = res.data;
          this.adminList['province'] = geojson;
          this.setSelectItems(select, 'province', 'Province', geojson);
          resolve();
        })
      })
    }

    private getDistricts() {
      this.setSelectedValue('sector','Sector');
      this.setSelectedValue('cell', 'Cell');
      this.setSelectedValue('village', 'Village');

      this.changeSelectDisabled('province', false);
      this.changeSelectDisabled('district', false);
      this.changeSelectDisabled('sector', false);
      this.changeSelectDisabled('cell', true);
      this.changeSelectDisabled('village', true);

      const province: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-province`);   
      const url = `${this.url}/${province.value}/district.geojson`;
      return new Promise<any>((resolve: (value?: any) => void, reject: (reason?: any) => void) => {
        axios.get(url).then(res => {
          const geojson = res.data;
          this.adminList['district'] = geojson;
          const select: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-district`);   
          this.setSelectItems(select, 'district', 'District', geojson);
          resolve();
        })
      })
    }

    private getSectors() {
      this.setSelectedValue('cell', 'Cell');
      this.setSelectedValue('village', 'Village');

      this.changeSelectDisabled('province', false);
      this.changeSelectDisabled('district', false);
      this.changeSelectDisabled('sector', false);
      this.changeSelectDisabled('cell', true);
      this.changeSelectDisabled('village', true);

      const province: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-province`);  
      const district: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-district`);   
      const url = `${this.url}/${province.value}/${district.value}/sector.geojson`;
      return new Promise<any>((resolve: (value?: any) => void, reject: (reason?: any) => void) => {
        axios.get(url).then(res => {
          const geojson = res.data;
          this.adminList['sector'] = geojson;
          const select: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-sector`);   
          this.setSelectItems(select, 'sector', 'Sector', geojson);
          resolve();
        })
      })
    }

    private getCells() {
      this.setSelectedValue('village', 'Village');

      this.changeSelectDisabled('province', true);
      this.changeSelectDisabled('district', false);
      this.changeSelectDisabled('sector', false);
      this.changeSelectDisabled('cell', false);
      this.changeSelectDisabled('village', true);

      const province: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-province`);  
      const district: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-district`);  
      const sector: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-sector`);  
      const url = `${this.url}/${province.value}/${district.value}/${sector.value}/cell.geojson`;
      return new Promise<any>((resolve: (value?: any) => void, reject: (reason?: any) => void) => {
        axios.get(url).then(res => {
          const geojson = res.data;
          this.adminList['cell'] = geojson;
          const select: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-cell`);   
          this.setSelectItems(select, 'cell', 'Cell', geojson);
          resolve();
        })
      })
    }

    private getVillages() {
      this.changeSelectDisabled('province', true);
      this.changeSelectDisabled('district', true);
      this.changeSelectDisabled('sector', false);
      this.changeSelectDisabled('cell', false);
      this.changeSelectDisabled('village', false);

      const province: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-province`);  
      const district: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-district`);  
      const sector: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-sector`); 
      const cell: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-cell`);  
      const url = `${this.url}/${province.value}/${district.value}/${sector.value}/${cell.value}/village.geojson`;
      return new Promise<any>((resolve: (value?: any) => void, reject: (reason?: any) => void) => {
        axios.get(url).then(res => {
          const geojson = res.data;
          this.adminList['village'] = geojson;
          const select: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-village`);   
          this.setSelectItems(select, 'village', 'Village', geojson);
          resolve();
        })
      })
    }

    public onRemove(): void
    {
      if (!this.controlContainer || !this.controlContainer.parentNode || !this.map || !this.mainButton) {
        return;
      }
      this.mainButton.removeEventListener("click", this.onDocumentClick);
      this.controlContainer.parentNode.removeChild(this.controlContainer);
      document.removeEventListener("click", this.onDocumentClick);
      this.map = undefined;
    }

    private onDocumentClick(event: MouseEvent): void{
      if (this.controlContainer && !this.controlContainer.contains(event.target as Element) && this.mainContainer && this.mainButton) {
        this.mainContainer.style.display = "none";
        this.mainButton.style.display = "block";

        var visibility = this.map?.getLayoutProperty(
          'selected-boundary',
          'visibility'
        );
        if (visibility === 'visible') {
          this.map?.setLayoutProperty(
            'selected-boundary',
            'visibility',
            'none'
          );
        }
        
      }
    }
}