<script lang="ts">
	import { Map, GeoJSONSource, setWorkerUrl } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Action } from 'svelte/action';
	import type { FeatureCollection } from 'geojson';
	import type { PageData } from './$types';

	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

	setWorkerUrl(workerUrl);

	let { data }: { data: PageData } = $props();

	const mapAction: Action<HTMLDivElement, { geojson: FeatureCollection }> = (node, params) => {
		const map = new Map({
			container: node,
			style: 'https://tiles.openfreemap.org/styles/liberty',
			center: [-111.09, 34.04],
			zoom: 6
		});

		map.on('load', () => {
			map.addSource('points', {
				type: 'geojson',
				data: params.geojson
			});

			map.addLayer({
				id: 'points-layer',
				type: 'circle',
				source: 'points',
				paint: {
					'circle-radius': 5,
					'circle-color': '#ff3e00',
					'circle-opacity': 0.8,
					'circle-stroke-width': 1,
					'circle-stroke-color': '#ffffff'
				}
			});
		});

		return {
			update(newParams) {
				if (map.isStyleLoaded()) {
					const source = map.getSource('points') as GeoJSONSource;
					if (source) source.setData(newParams.geojson);
				}
			},
			destroy() {
				map.remove();
			}
		};
	};
</script>

<div use:mapAction={data} style="width: 100%; height: 100vh;"></div>
