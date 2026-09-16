import type { PageServerLoad } from './$types';
import { getConnection } from '$lib/server/db';
import type { FeatureCollection } from 'geojson';

export const load: PageServerLoad = async () => {
	const conn = await getConnection();

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
            FROM wpp_arizona
            WHERE LONGITUDE IS NOT NULL AND LATITUDE IS NOT NULL
            GROUP BY 1, 2, 3
        )
    `);

	const row = reader.getRowObjects()[0];
	const rawJson = (row?.geojson as string) ?? '{"type":"FeatureCollection","features":[]}';
	const rawCategories = (row?.categories as string[]) ?? [];

	reader = await conn.runAndReadAll(
		'SELECT DISTINCT TOP_CATEGORY FROM wpp_arizona WHERE TOP_CATEGORY IS NOT NULL'
	);
	const categoryRows = reader.getRowObjects();
	const categoryOptions = categoryRows.map((row) => row?.TOP_CATEGORY as string);

	return {
		geojson: JSON.parse(rawJson) as FeatureCollection,
		categories: Array.from(rawCategories).sort(),
		categoryOptions
	};
};
