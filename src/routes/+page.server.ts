import type { PageServerLoad } from './$types';
import { getConnection } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const conn = await getConnection();

	let reader = await conn.runAndReadAll(
		`SELECT LONGITUDE, LATITUDE, SUM(VISIT_COUNTS)::INT AS VISIT_COUNTS, NTILE(10) OVER (ORDER BY SUM(VISIT_COUNTS)) / 10 AS DECILE
         FROM wpp_arizona
         GROUP BY 1, 2`
	);
	const points = reader.getRowObjects();

	reader = await conn.runAndReadAll(
		'SELECT ST_AsGeoJSON(ST_Boundary(geom)) AS geojson FROM arizona_shp'
	);
	const lines = reader.getRowObjects();

	reader = await conn.runAndReadAll(`
        WITH shape_extent AS (
            SELECT
                MIN(ST_XMin(geom)) AS min_x,
                MAX(ST_XMax(geom)) AS max_x,
                MIN(ST_YMin(geom)) AS min_y,
                MAX(ST_YMax(geom)) AS max_y
            FROM arizona_shp
        ),
        point_extent AS (
            SELECT MIN(LONGITUDE) AS min_x, MAX(LONGITUDE) AS max_x, MIN(LATITUDE) AS min_y, MAX(LATITUDE) AS max_y
            FROM wpp_arizona
        )
        SELECT
            LEAST(s.min_x, p.min_x) AS min_x,
            GREATEST(s.max_x, p.max_x) AS max_x,
            LEAST(s.min_y, p.min_y) AS min_y,
            GREATEST(s.max_y, p.max_y) AS max_y
        FROM shape_extent s, point_extent p
    `);
	const bounds = reader.getRowObjects()[0];

	return { points, lines, bounds };
};
