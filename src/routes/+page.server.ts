import type { PageServerLoad } from './$types';
import { getConnection } from '$lib/server/db';
import type { FeatureCollection } from 'geojson';

export const load: PageServerLoad = async () => {
	const conn = await getConnection();

	const reader = await conn.runAndReadAll(`
        SELECT
            json_object(
                'type', 'FeatureCollection',
                'features', json_group_array(
                    json_object(
                        'type', 'Feature',
                        'geometry', json(ST_AsGeoJSON(geom)),
                        'properties', json_object(
                            'name', name,
                            'slug', lower(name),
                            'fips', fips
                        )
                    )
                )
            ) as geojson
        FROM (
            SELECT * FROM state_boundaries ORDER BY name
        )
    `);

	const row = reader.getRowObjects()[0];
	const rawJson = (row?.geojson as string) ?? '{"type":"FeatureCollection","features":[]}';

	return {
		geojson: JSON.parse(rawJson) as FeatureCollection
	};
};
