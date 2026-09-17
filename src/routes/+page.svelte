<script lang="ts">
	import { Map, setWorkerUrl } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Action } from 'svelte/action';
	import type { FeatureCollection } from 'geojson';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

	setWorkerUrl(workerUrl);

	let { data }: { data: PageData } = $props();

	const mapAction: Action<HTMLDivElement, FeatureCollection> = (node, geojson) => {
		const map = new Map({
			container: node,
			style: 'https://tiles.openfreemap.org/styles/liberty',
			center: [-98.5, 33],
			zoom: 3.5
		});

		map.on('load', () => {
			map.addSource('states', {
				type: 'geojson',
				data: geojson
			});

			map.addLayer({
				id: 'states-fill',
				type: 'fill',
				source: 'states',
				paint: {
					'fill-color': '#ff3e00',
					'fill-opacity': 0.35
				}
			});

			map.addLayer({
				id: 'states-outline',
				type: 'line',
				source: 'states',
				paint: {
					'line-color': '#ff3e00',
					'line-width': 2
				}
			});

			map.on('mouseenter', 'states-fill', () => {
				map.getCanvas().style.cursor = 'pointer';
			});
			map.on('mouseleave', 'states-fill', () => {
				map.getCanvas().style.cursor = '';
			});

			map.on('click', 'states-fill', (e) => {
				const slug = e.features?.[0]?.properties?.slug as string | undefined;
				if (slug) goto(`/${slug}`);
			});
		});

		return {
			destroy() {
				map.remove();
			}
		};
	};
</script>

<div class="container">
	<div class="tooltip">
		<strong>States with data</strong>
		<span>Click a state to explore its points of interest</span>
	</div>

	<div class="map" use:mapAction={data.geojson}></div>
</div>

<style>
	.container {
		position: relative;
		width: 100vw;
		height: 100vh;
	}

	.tooltip {
		position: absolute;
		top: 16px;
		left: 16px;
		background-color: #fbfaf7;
		padding: 10px 14px;
		border-radius: 6px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-family: system-ui, sans-serif;
		font-size: 14px;
	}

	.map {
		width: 100%;
		height: 100%;
		z-index: 0;
	}
</style>
