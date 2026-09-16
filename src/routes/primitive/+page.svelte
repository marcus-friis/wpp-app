<script lang="ts">
	let { data } = $props();

	type Coord = [number, number];
	type LineStringGeom = { type: 'LineString'; coordinates: Coord[] };
	type MultiLineStringGeom = { type: 'MultiLineString'; coordinates: Coord[][] };
	type Geom = LineStringGeom | MultiLineStringGeom | { type: string; coordinates: unknown };

	const lines = $derived.by(() => {
		const result: Coord[][] = [];
		for (const row of data.lines) {
			const geom = JSON.parse(row.geojson as string) as Geom;
			if (geom.type === 'LineString') {
				result.push((geom as LineStringGeom).coordinates);
			} else if (geom.type === 'MultiLineString') {
				result.push(...(geom as MultiLineStringGeom).coordinates);
			}
		}
		return result;
	});

	const minX = $derived(Number(data.bounds.min_x));
	const maxX = $derived(Number(data.bounds.max_x));
	const minY = $derived(Number(data.bounds.min_y));
	const maxY = $derived(Number(data.bounds.max_y));

	const width = 800;
	const height = 800;
	const padding = 20;

	function scaleX(lon: number) {
		return padding + ((lon - minX) / (maxX - minX)) * (width - 2 * padding);
	}
	function scaleY(lat: number) {
		return height - padding - ((lat - minY) / (maxY - minY)) * (height - 2 * padding);
	}

	function toPath(coords: Coord[]) {
		return coords
			.map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'} ${scaleX(lon)} ${scaleY(lat)}`)
			.join(' ');
	}
</script>

<svg {width} {height} style="border: 1px solid #ccc;">
	{#each lines as line}
		<path d={toPath(line)} fill="none" stroke="#999" stroke-width="1" />
	{/each}
	{#each data.points as row}
		<circle
			cx={scaleX(Number(row.LONGITUDE))}
			cy={scaleY(Number(row.LATITUDE))}
			r={row.DECILE}
			fill="rebeccapurple"
		/>
	{/each}
</svg>
