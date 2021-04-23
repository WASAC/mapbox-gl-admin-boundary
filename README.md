# mapbox-gl-admin-boundary
![GitHub](https://img.shields.io/github/license/watergis/mapbox-gl-admin-boundary)

This module adds area switcher control which is able to zoom administrative boundaries to mapbox-gl

## Installation:

```bash
npm i https://github.com/WASAC/mapbox-gl-admin-boundary.git
```

## Demo:

See [demo](https://watergis.github.io/mapbox-gl-admin-boundary).

## Test:

```
npm run build
npm start
```

open [http://localhost:8080](http://localhost:8080).

## Usage:

```ts
import MapboxAdminBoundaryControl from "mapbox-gl-admin-boundary";
import { Map as MapboxMap } from "mapbox-gl";

import "mapbox-gl-admin-boundary/css/styles.css";

const map = new MapboxMap();
map.addControl(new MapboxAdminBoundaryControl(
        'https://wasac.github.io/rw-admin-boundary'
    ), 'top-right');
```
