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

        const this_ = this;
        this.map.on('load', function() {
          this_.map?.addSource('selected-boundary', { type: 'geojson', data: {
            'type': 'FeatureCollection',
            'features': []
          } });
          this_.map?.addLayer({
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
          this_.selectOnChange();
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

        [
          { id: 'province',title: 'Province'},
          { id: 'district',title: 'District'},
          { id: 'sector',title: 'Sector'},
          { id: 'cell',title: 'Cell'},
          { id: 'village',title: 'Village'},
        ].forEach((value: any) =>{
          const select = this.createSelection(value.id, value.title);
          table.appendChild(select.tr);
          select.content.addEventListener('change', (event: any) => {
            const id = event.target.value;
            this.selectOnChange(id, value.id);
          });
        })
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
        content.style.display = 'flex';
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

    private changeSelectVisibility(id: string, visibility: boolean) {
      const target : HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-${id}`); 
      if (visibility){
        target.style.display = 'flex';
      }else{
        target.style.display = 'none';
      }
    }

    private zoomToSelectedFeature(
      selectedId: number,
      selectedBoundary: 'province' | 'district' | 'sector' | 'cell' | 'village'
    ){
      const geojson: GeoJSON.FeatureCollection = this.adminList[selectedBoundary];

      for (let i = 0; i < geojson.features.length; i++){
        const f = geojson.features[i];
        if (f.properties?.id == selectedId){
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

    private selectOnChange(
      selectedId?: number,
      selectedBoundary?: 'province' | 'district' | 'sector' | 'cell' | 'village'
    ) {
      if (selectedId && selectedBoundary) {
        this.zoomToSelectedFeature(selectedId, selectedBoundary);
      }

      if (selectedBoundary && selectedBoundary === 'village'){
        return;
      }

      return new Promise<any>((resolve: (value?: any) => void, reject: (reason?: any) => void) => {
        const province: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-province`);  
        const district: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-district`);  
        const sector: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-sector`); 
        const cell: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-cell`); 
        const village: HTMLSelectElement = <HTMLSelectElement>document.getElementById(`mapbox-gl-admin-select-village`);  
  
        switch (selectedBoundary){
          case 'province':
            this.setSelectItems(district, 'district', 'District');
            this.setSelectItems(sector, 'sector', 'Sector');
            this.setSelectItems(cell, 'cell', 'Cell');
            this.setSelectItems(village, 'village', 'Village');
            break;
          case 'district':
            this.setSelectItems(sector, 'sector', 'Sector');
            this.setSelectItems(cell, 'cell', 'Cell');
            this.setSelectItems(village, 'village', 'Village');
            break;
          case 'sector':
            this.setSelectItems(cell, 'cell', 'Cell');
            this.setSelectItems(village, 'village', 'Village');
            break;
          case 'cell':
            this.setSelectItems(village, 'village', 'Village');
            break;
          default:
            break;
        }

        const prov_id: string | undefined = (province && province.value !== '')?province.value:undefined;
        const dist_id: string | undefined = (district && district.value !== '')?district.value:undefined;
        const sect_id: string | undefined = (sector && sector.value !== '')?sector.value:undefined;
        const cell_id: string | undefined = (cell && cell.value !== '')?cell.value:undefined;

        let url: string = '';
        let config: any;
        if (prov_id && dist_id && sect_id && cell_id){
          url = `${this.url}/${prov_id}/${dist_id}/${sect_id}/${cell_id}/village.geojson`;
          config = { id: 'village', title: 'Village', select: village }

          this.changeSelectVisibility('district',true);
          this.changeSelectVisibility('sector',true);
          this.changeSelectVisibility('cell',true);
          this.changeSelectVisibility('village',true);
        }else if (prov_id && dist_id && sect_id){
          url = `${this.url}/${prov_id}/${dist_id}/${sect_id}/cell.geojson`;
          config = { id: 'cell', title: 'Cell', select: cell}

          this.changeSelectVisibility('district',true);
          this.changeSelectVisibility('sector',true);
          this.changeSelectVisibility('cell',true);
          this.changeSelectVisibility('village',false);
        }else if (prov_id && dist_id){
          url = `${this.url}/${prov_id}/${dist_id}/sector.geojson`;
          config = { id: 'sector', title: 'Sector', select: sector}

          this.changeSelectVisibility('district',true);
          this.changeSelectVisibility('sector',true);
          this.changeSelectVisibility('cell',false);
          this.changeSelectVisibility('village',false);
        }else if (prov_id){
          url = `${this.url}/${prov_id}/district.geojson`;
          config = { id: 'district', title: 'District', select:district}

          this.changeSelectVisibility('district',true);
          this.changeSelectVisibility('sector',false);
          this.changeSelectVisibility('cell',false);
          this.changeSelectVisibility('village',false);
        }else{
          url = `${this.url}/province.geojson`;
          config = { id: 'province', title: 'Province', select:province}

          this.changeSelectVisibility('district',false);
          this.changeSelectVisibility('sector',false);
          this.changeSelectVisibility('cell',false);
          this.changeSelectVisibility('village',false);
        }
        axios.get(url).then(res => {
          const geojson = res.data;
          this.adminList[config.id] = geojson;
          this.setSelectItems(config.select, config.id, config.title, geojson);
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