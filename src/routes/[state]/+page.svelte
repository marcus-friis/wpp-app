<script lang="ts">
	import { Map, GeoJSONSource, setWorkerUrl, type FilterSpecification } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Action } from 'svelte/action';
	import type { FeatureCollection } from 'geojson';
	import type { PageData } from './$types';
	import NumberFlow from '@number-flow/svelte';

	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

	setWorkerUrl(workerUrl);

	let { data }: { data: PageData } = $props();
	let totalPoints = $derived(data.geojson.features.length);

	let selectedCategory = $state('all');
	let viewportPoints = $state(0);
	const visiblePercentage = $derived(totalPoints > 0 ? viewportPoints / totalPoints : 0);

	type MapActionParams = {
		geojson: FeatureCollection;
		category: string;
		center: [number, number];
		bounds: [[number, number], [number, number]];
		onViewportCountChange?: (count: number) => void;
	};

	const mapAction: Action<HTMLDivElement, MapActionParams> = (node, initialParams) => {
		let currentParams = initialParams;

		const map = new Map({
			container: node,
			style: 'https://tiles.openfreemap.org/styles/liberty',
			center: currentParams.center,
			zoom: 6
		});

		map.fitBounds(currentParams.bounds, {
			padding: 40,
			duration: 0
		});

		const updateViewportCount = () => {
			if (!map.getLayer('points-layer')) return;

			const features = map.queryRenderedFeatures(undefined, {
				layers: ['points-layer']
			});

			currentParams.onViewportCountChange?.(features.length);
		};

		let countTimeout: ReturnType<typeof setTimeout>;
		const scheduleViewportCount = () => {
			clearTimeout(countTimeout);
			countTimeout = setTimeout(() => {
				updateViewportCount();
			}, 100);
		};

		const updateFilter = () => {
			if (!map.getLayer('points-layer')) return;

			const filterExpression: FilterSpecification | null =
				currentParams.category === 'all'
					? null
					: (['==', ['get', 'category'], currentParams.category] as FilterSpecification);

			map.setFilter('points-layer', filterExpression);

			requestAnimationFrame(updateViewportCount);
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
					'circle-radius': 2,
					'circle-color': '#ff3e00',
					'circle-opacity': 0.8,
					'circle-stroke-width': 1,
					'circle-stroke-color': '#ffffff'
				}
			});

			updateFilter();
			updateViewportCount();

			map.on('moveend', scheduleViewportCount);
			map.on('zoomend', scheduleViewportCount);
		});

		return {
			update(newParams) {
				currentParams = newParams;

				if (map.getLayer('points-layer')) {
					const source = map.getSource('points') as GeoJSONSource;

					if (source) {
						source.setData(currentParams.geojson);
					}

					updateFilter();
					updateViewportCount();
				}
			},

			destroy() {
				map.remove();
			}
		};
	};
</script>

<div class="container">
	<aside class="tooltip">
		<nav>
			<a href="/" class="back-link">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M19 12H5M12 19l-7-7 7-7" />
				</svg>
				Back
			</a>
		</nav>
		<div class="stats">
			<div class="stat-row">
				<span class="stat-label">Total points</span>
				<span class="stat-value">{totalPoints.toLocaleString()}</span>
			</div>
			<div class="stat-row">
				<span class="stat-label">In viewport</span>
				<span class="stat-value">
					<NumberFlow value={viewportPoints} willChange={true} />
				</span>
			</div>
			<div class="stat-row stat-row--percent">
				<NumberFlow
					value={visiblePercentage}
					format={{
						style: 'percent',
						maximumFractionDigits: 1
					}}
					locales="en-DK"
					willChange={true}
				/>
				<span class="stat-label">of total visible</span>
			</div>
		</div>

		<div class="filter">
			<label for="category-select">Category</label>
			<select id="category-select" bind:value={selectedCategory}>
				<option value="all">All ({data.geojson.features.length})</option>

				{#each data.categoryOptions as cat}
					{#if cat}
						<option value={cat}>{cat}</option>
					{/if}
				{/each}
			</select>
		</div>
	</aside>

	<div
		class="map"
		use:mapAction={{
			geojson: data.geojson,
			category: selectedCategory,
			center: data.center,
			bounds: data.bounds,
			onViewportCountChange: (count) => {
				viewportPoints = count;
			}
		}}
	></div>
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
		z-index: 1;
		width: 220px;
		background-color: #fbfaf7;
		border-radius: 10px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		font-family: system-ui, sans-serif;
		overflow: hidden;
	}

	.tooltip nav {
		padding: 10px 16px;
		border-bottom: 1px solid #e5e5e0;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #8a8a85;
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.back-link:hover {
		color: #ff3e00;
	}

	.back-link svg {
		transition: transform 0.15s ease;
	}

	.back-link:hover svg {
		transform: translateX(-2px);
	}

	.stats {
		display: flex;
		flex-direction: column;
		padding: 14px 16px;
		gap: 6px;
	}

	.stat-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		font-size: 13px;
	}

	.stat-label {
		color: #8a8a85;
	}

	.stat-value {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: #1a1a1a;
	}

	.stat-row--percent {
		margin-top: 4px;
		justify-content: flex-start;
		gap: 6px;
		font-size: 20px;
		font-weight: 700;
		color: #ff3e00;
	}

	.stat-row--percent .stat-label {
		font-size: 12px;
		font-weight: 400;
		color: #8a8a85;
	}

	.filter {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 12px 16px;
		background-color: #f2f1ec;
		border-top: 1px solid #e5e5e0;
	}

	.filter label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #8a8a85;
	}

	.filter select {
		padding: 6px 8px;
		border-radius: 5px;
		border: 1px solid #d5d4cf;
		background: #fff;
		font-size: 13px;
	}

	.map {
		width: 100%;
		height: 100%;
		z-index: 0;
	}
</style>
