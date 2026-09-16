import type { PageServerLoad } from './$types';
import { getConnection } from '$lib/server/db';
import type { FeatureCollection } from 'geojson';

export const load: PageServerLoad = async () => {
	const conn = await getConnection();

	const reader = await conn.runAndReadAll(`
        SELECT json_object(
            'type', 'FeatureCollection',
            'features', json_group_array(
                json_object(
                    'type', 'Feature',
                    'geometry', json_object(
                        'type', 'Point',
                        'coordinates', [CAST(LONGITUDE AS DOUBLE), CAST(LATITUDE AS DOUBLE)]
                    ),
                    'properties', json_object()
                )
            )
        ) as geojson
        FROM (
            SELECT LONGITUDE, LATITUDE
            FROM wpp_arizona
            WHERE LONGITUDE IS NOT NULL AND LATITUDE IS NOT NULL
            LIMIT 10000
        )
    `);

	const rows = reader.getRowObjects();
	const rawJson = (rows[0]?.geojson as string) ?? '{"type":"FeatureCollection","features":[]}';

	return {
		geojson: JSON.parse(rawJson) as FeatureCollection
	};
};
