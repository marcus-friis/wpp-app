import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getConnection } from '$lib/server/db';
import type { FeatureCollection } from 'geojson';

export const entries = () => {
	return [
		{ state: 'AL' },
		{ state: 'AK' },
		{ state: 'AZ' },
		{ state: 'AR' },
		{ state: 'CA' },
		{ state: 'CO' },
		{ state: 'CT' },
		{ state: 'DE' },
		{ state: 'DC' },
		{ state: 'FL' },
		{ state: 'GA' },
		{ state: 'HI' },
		{ state: 'ID' },
		{ state: 'IL' },
		{ state: 'IN' },
		{ state: 'IA' },
		{ state: 'KS' },
		{ state: 'KY' },
		{ state: 'LA' },
		{ state: 'ME' },
		{ state: 'MD' },
		{ state: 'MA' },
		{ state: 'MI' },
		{ state: 'MN' },
		{ state: 'MS' },
		{ state: 'MO' },
		{ state: 'MT' },
		{ state: 'NE' },
		{ state: 'NV' },
		{ state: 'NH' },
		{ state: 'NJ' },
		{ state: 'NM' },
		{ state: 'NY' },
		{ state: 'NC' },
		{ state: 'ND' },
		{ state: 'OH' },
		{ state: 'OK' },
		{ state: 'OR' },
		{ state: 'PA' },
		{ state: 'PR' },
		{ state: 'RI' },
		{ state: 'SC' },
		{ state: 'SD' },
		{ state: 'TN' },
		{ state: 'TX' },
		{ state: 'UT' },
		{ state: 'VT' },
		{ state: 'VA' },
		{ state: 'VI' },
		{ state: 'WA' },
		{ state: 'WV' },
		{ state: 'WI' },
		{ state: 'WY' }
	];
};

export const load: PageServerLoad = async ({ params }) => {
	const conn = await getConnection();
	const { state } = params;

	let reader = await conn.runAndReadAll(`
        SELECT STATEFP
        FROM states
        WHERE lower(ABBR) = lower('${state}')
    `);
	const fipsRow = reader.getRowObjects();
	const fips = fipsRow[0]?.STATEFP;

	if (!fips) {
		throw error(404, `Unknown state: ${state}`);
	}

	reader = await conn.runAndReadAll(`
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
            with bg as (
                select *
                from block_groups
                where statefp = '${fips}'
            )
            select TOP_CATEGORY, LONGITUDE, LATITUDE
            from pois p
            join bg
              on bg.geom && p.geom
             and ST_Within(p.geom, bg.geom)
        )
    `);

	const row = reader.getRowObjects()[0];
	const rawJson = (row?.geojson as string) ?? '{"type":"FeatureCollection","features":[]}';
	const rawCategories = (row?.categories as string[]) ?? [];

	reader = await conn.runAndReadAll(
		`SELECT DISTINCT TOP_CATEGORY FROM pois WHERE TOP_CATEGORY IS NOT NULL`
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
        FROM states
        WHERE STATEFP = '${fips}'
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
