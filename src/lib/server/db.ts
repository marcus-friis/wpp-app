import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api';

const dbPath = '/Users/marfri/Desktop/weekly-patterns-plus-exploration/data/mydb.duckdb';

let connection: DuckDBConnection | undefined;

export async function getConnection() {
	if (!connection) {
		const instance = await DuckDBInstance.create(dbPath, { access_mode: 'READ_ONLY' });
		connection = await instance.connect();
		await connection.run('INSTALL spatial; LOAD spatial;');
	}
	return connection;
}
