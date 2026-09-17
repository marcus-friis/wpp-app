<script lang="ts">
	import { Map, GeoJSONSource, setWorkerUrl, type FilterSpecification } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Action } from 'svelte/action';
	import type { FeatureCollection } from 'geojson';
	import type { PageData } from './$types';

	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

	setWorkerUrl(workerUrl);

	let { data }: { data: PageData } = $props();
	let selectedCategory = $state('all');

	type MapActionParams = { geojson: FeatureCollection; category: string };

	const mapAction: Action<HTMLDivElement, MapActionParams> = (node, initialParams) => {
		let currentParams = initialParams;

		const map = new Map({
			container: node,
			style: 'https://tiles.openfreemap.org/styles/liberty',
			center: [-111.09, 34.04],
			zoom: 6
		});

		const updateFilter = () => {
			if (!map.getLayer('points-layer')) return;

			const filterExpression: FilterSpecification | null =
				currentParams.category === 'all'
					? null
					: (['==', ['get', 'category'], currentParams.category] as FilterSpecification);

			map.setFilter('points-layer', filterExpression);
		};

		map.on('load', () => {
			map.addSource('points', {
				type: 'geojson',
				data: currentParams.geojson
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

			// Apply filter active at the time map finished loading
			updateFilter();
		});

		return {
			update(newParams) {
				currentParams = newParams;
				if (map.getLayer('points-layer')) {
					const source = map.getSource('points') as GeoJSONSource;
					if (source) source.setData(currentParams.geojson);
					updateFilter();
				}
			},
			destroy() {
				map.remove();
			}
		};
	};
</script>

<div class="container">
	<div class="tooltip">
		<label for="category-select">Filter Category:</label>
		<select id="category-select" bind:value={selectedCategory}>
			<option value="all">All Categories ({data.geojson.features.length})</option>
			{#each data.categoryOptions as cat}
				{#if cat}
					<option value={cat}>{cat}</option>
				{/if}
			{/each}
		</select>
	</div>

	<div class="map" use:mapAction={{ geojson: data.geojson, category: selectedCategory }}></div>
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
		align-items: center;
		gap: 8px;
		font-family: system-ui, sans-serif;
		font-size: 14px;
	}

	.tooltip select {
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid #ccc;
		background: #fff;
	}

	.map {
		width: 100%;
		height: 100%;
		z-index: 0;
	}
</style>
