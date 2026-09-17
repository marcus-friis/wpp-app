import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getConnection } from '$lib/server/db';
import type { FeatureCollection } from 'geojson';

export const entries = () => {
	return [{ state: 'arizona' }, { state: 'florida' }, { state: 'texas' }];
};

export const load: PageServerLoad = async ({ params }) => {
	const conn = await getConnection();
	const { state } = params;

	const fibsMap: Record<string, string> = {
		arizona: '04',
		florida: '12',
		texas: '48'
	};

	const fips = fibsMap[state.toLowerCase().trim()];

	if (!fips) {
		throw error(404, `Unknown state: ${state}`);
	}

	let reader = await conn.runAndReadAll(`
        SELECT
            LIST(DISTINCT TOP_CATEGORY) FILTER (WHERE TOP_CATEGORY IS NOT NULL) as categories,
            json_object(
                'type', 'FeatureCollection',
                'features', json_group_array(
                    json_object(
                        'type', 'Feature',
                        'geometry', json_object(
                            'type', 'Point',
                            'coordinates', [CAST(LONGITUDE AS DOUBLE), CAST(LATITUDE AS DOUBLE)]
                        ),
                        'properties', json_object(
                            'category', TOP_CATEGORY
                        )
                    )
                )
            ) as geojson
        FROM (
            SELECT LONGITUDE, LATITUDE, TOP_CATEGORY
            FROM pois_${fips}
            WHERE LONGITUDE IS NOT NULL AND LATITUDE IS NOT NULL
            GROUP BY 1, 2, 3
        )
    `);

	const row = reader.getRowObjects()[0];
	const rawJson = (row?.geojson as string) ?? '{"type":"FeatureCollection","features":[]}';
	const rawCategories = (row?.categories as string[]) ?? [];

	reader = await conn.runAndReadAll(
		`SELECT DISTINCT TOP_CATEGORY FROM pois_${fips} WHERE TOP_CATEGORY IS NOT NULL`
	);
	const categoryRows = reader.getRowObjects();
	const categoryOptions = categoryRows.map((row) => row?.TOP_CATEGORY as string);

	reader = await conn.runAndReadAll(`
        SELECT
            ST_X(ST_Centroid(geom)) as centerLng,
            ST_Y(ST_Centroid(geom)) as centerLat,
            ST_XMin(geom) as minLng,
            ST_YMin(geom) as minLat,
            ST_XMax(geom) as maxLng,
            ST_YMax(geom) as maxLat
        FROM state_boundaries
        WHERE fips = '${fips}'
    `);
	const boundsRow = reader.getRowObjects()[0];

	return {
		geojson: JSON.parse(rawJson) as FeatureCollection,
		categories: Array.from(rawCategories).sort(),
		categoryOptions,
		center: [boundsRow.centerLng as number, boundsRow.centerLat as number] as [number, number],
		bounds: [
			[boundsRow.minLng as number, boundsRow.minLat as number],
			[boundsRow.maxLng as number, boundsRow.maxLat as number]
		] as [[number, number], [number, number]]
	};
};
