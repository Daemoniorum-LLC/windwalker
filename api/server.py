#!/usr/bin/env python3
"""
Windwalker API Server (Python fallback)

Serves the REST API while Sigil toolchain is being set up.
Connects to the same PostgreSQL database.
"""

import json
import os
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen, Request
from urllib.error import URLError
import psycopg2
from psycopg2.extras import RealDictCursor

# Native-Land.ca API key
NATIVE_LAND_API_KEY = os.environ.get('NATIVE_LAND_API_KEY', 'I4Fi9hqW-544NkOMBnpF-')

# Simple cache for boundaries (refreshes every 24 hours)
_boundaries_cache = {'data': None, 'timestamp': 0, 'ttl': 86400}

# Configuration
HOST = os.environ.get('HOST', '127.0.0.1')
PORT = int(os.environ.get('PORT', '8080'))
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://localhost/windwalker_staging')
STATIC_DIR = os.environ.get('STATIC_DIR', '../web/dist')

def get_db():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

class WindwalkerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve static files from web/dist
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # API routes
        if path.startswith('/api/v1/'):
            self.handle_api(path, query)
        elif path == '/health':
            self.send_json({'status': 'healthy', 'database': 'connected'})
        else:
            # Check if it's a static file (has extension)
            if '.' in path.split('/')[-1]:
                # Serve static files
                super().do_GET()
            else:
                # SPA fallback: serve index.html for client-side routes
                self.path = '/index.html'
                super().do_GET()

    def handle_api(self, path, query):
        try:
            if path == '/api/v1/treaties':
                self.get_treaties(query)
            elif path.startswith('/api/v1/treaties/') and not path.endswith('/geometry'):
                treaty_id = path.split('/')[-1]
                self.get_treaty(treaty_id)
            elif path == '/api/v1/tribes':
                self.get_tribes(query)
            elif path.startswith('/api/v1/tribes/'):
                tribe_id = path.split('/')[-1]
                self.get_tribe(tribe_id)
            elif path == '/api/v1/search':
                self.search(query)
            elif path == '/api/v1/sources':
                self.get_sources()
            elif path == '/api/v1/boundaries':
                self.get_boundaries()
            else:
                self.send_json({'error': 'Not found'}, 404)
        except Exception as e:
            self.send_json({'error': str(e)}, 500)

    def get_treaties(self, query):
        conn = get_db()
        cur = conn.cursor()

        # Year filter parameters
        year = query.get('year', [None])[0]
        year_end = query.get('year_end', [None])[0]

        params = []
        where_clauses = []

        if year:
            where_clauses.append("EXTRACT(YEAR FROM date_signed) >= %s")
            params.append(int(year))
        if year_end:
            where_clauses.append("EXTRACT(YEAR FROM date_signed) <= %s")
            params.append(int(year_end))

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        sql = f"""
            SELECT
                id::text,
                title as name,
                date_signed::text as signed_date,
                tribal_parties_text as tribes,
                CASE WHEN is_validated THEN 'Active' ELSE 'Unknown' END as status,
                CASE WHEN is_validated THEN 'Verified' ELSE 'Reported' END as certainty,
                kappler_volume,
                kappler_page
            FROM raw_treaties
            {where_sql}
            ORDER BY date_signed ASC NULLS LAST
            LIMIT 500
        """

        cur.execute(sql, params)
        rows = cur.fetchall()

        treaties = []
        for row in rows:
            treaties.append({
                'id': row['id'],
                'name': row['name'],
                'signed_date': row['signed_date'],
                'tribes': [{'id': t, 'name': t} for t in (row['tribes'] or [])],
                'status': row['status'],
                'certainty': row['certainty'],
                'kappler_ref': f"Kappler Vol. {row['kappler_volume']}, p. {row['kappler_page']}" if row['kappler_volume'] else None
            })

        conn.close()
        self.send_json({'treaties': treaties, 'total': len(treaties)})

    def get_treaty(self, treaty_id):
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                t.id::text,
                t.title as name,
                t.date_signed_text,
                t.date_signed::text as signed_date,
                t.date_ratified::text as ratified_date,
                t.tribal_parties_text as tribes,
                t.us_commissioners_text as us_commissioners,
                t.signatures_text as signatories,
                t.preamble,
                t.articles_text as articles,
                t.statutes_at_large_citation,
                t.kappler_volume,
                t.kappler_page,
                t.is_validated,
                t.source_url,
                ds.name as source_name,
                ds.reliability as source_reliability
            FROM raw_treaties t
            JOIN data_sources ds ON t.source_id = ds.id
            WHERE t.id::text = %s
        """, (treaty_id,))

        row = cur.fetchone()
        conn.close()

        if not row:
            self.send_json({'error': 'Treaty not found'}, 404)
            return

        treaty = {
            'id': row['id'],
            'name': row['name'],
            'alternate_names': [],
            'signed_date': row['signed_date'],
            'signed_date_text': row['date_signed_text'],
            'ratified_date': row['ratified_date'],
            'proclaimed_date': None,
            'tribes': [{'id': t, 'name': t} for t in (row['tribes'] or [])],
            'us_commissioners': row['us_commissioners'] or [],
            'tribal_signatories': row['signatories'] or [],
            'status': 'Active' if row['is_validated'] else 'Unknown',
            'violations': [],
            'affecting_laws': [],
            'preamble': row['preamble'],
            'articles': row['articles'] or [],
            'ceded_territory_acres': None,
            'reserved_territory_acres': None,
            'boundary_certainty': 'Verified' if row['is_validated'] else 'Reported',
            'sources': [{
                'name': row['source_name'],
                'source_type': 'Government',
                'url': row['source_url'],
                'reliability': float(row['source_reliability']),
                'accessed_date': None
            }],
            'kappler_citation': f"Kappler Vol. {row['kappler_volume']}, p. {row['kappler_page']}" if row['kappler_volume'] else None,
            'statutes_at_large': row['statutes_at_large_citation']
        }

        self.send_json(treaty)

    def get_tribes(self, query):
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                id::text,
                name,
                alternate_names,
                region,
                state,
                federally_recognized,
                name_evidentiality::text as certainty
            FROM raw_tribes
            ORDER BY name ASC
            LIMIT 100
        """)

        rows = cur.fetchall()
        conn.close()

        tribes = [{
            'id': row['id'],
            'name': row['name'],
            'alternate_names': row['alternate_names'] or [],
            'region': row['region'],
            'state': row['state'],
            'federally_recognized': row['federally_recognized'],
            'treaty_count': 0,
            'certainty': row['certainty']
        } for row in rows]

        self.send_json({'tribes': tribes, 'total': len(tribes)})

    def get_tribe(self, tribe_id):
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            SELECT * FROM raw_tribes WHERE id::text = %s
        """, (tribe_id,))

        row = cur.fetchone()
        conn.close()

        if not row:
            self.send_json({'error': 'Tribe not found'}, 404)
            return

        self.send_json(dict(row))

    def search(self, query):
        q = query.get('q', [''])[0]
        if not q:
            self.send_json({'results': [], 'total': 0})
            return

        conn = get_db()
        cur = conn.cursor()

        results = []

        # Search treaties
        cur.execute("""
            SELECT id::text, title, 'treaty' as entity_type
            FROM raw_treaties
            WHERE title ILIKE %s
            LIMIT 10
        """, (f'%{q}%',))

        for row in cur.fetchall():
            results.append({
                'entity_type': 'treaty',
                'id': row['id'],
                'title': row['title'],
                'snippet': None,
                'url': f"/treaties/{row['id']}",
                'score': 1.0
            })

        # Search tribes
        cur.execute("""
            SELECT id::text, name, 'tribe' as entity_type
            FROM raw_tribes
            WHERE name ILIKE %s
            LIMIT 10
        """, (f'%{q}%',))

        for row in cur.fetchall():
            results.append({
                'entity_type': 'tribe',
                'id': row['id'],
                'title': row['name'],
                'snippet': None,
                'url': f"/tribes/{row['id']}",
                'score': 1.0
            })

        conn.close()
        self.send_json({'query': q, 'results': results, 'total': len(results)})

    def get_sources(self):
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            SELECT source_id as id, name, source_type::text as type,
                   base_url, last_scraped::text, reliability
            FROM data_sources
            ORDER BY reliability DESC
        """)

        rows = cur.fetchall()
        conn.close()

        self.send_json({'sources': [dict(row) for row in rows]})

    def get_boundaries(self):
        """Fetch treaty boundaries from Native-Land.ca (with caching)"""
        global _boundaries_cache

        now = time.time()

        # Check cache
        if _boundaries_cache['data'] and (now - _boundaries_cache['timestamp']) < _boundaries_cache['ttl']:
            self.send_json(_boundaries_cache['data'])
            return

        try:
            # Fetch from Native-Land.ca CDN (the API redirects here)
            url = 'https://d2u5ssx9zi93qh.cloudfront.net/treaties.geojson'
            req = Request(url, headers={'User-Agent': 'Windwalker/1.0'})
            with urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode('utf-8'))

            # Cache the result
            _boundaries_cache['data'] = data
            _boundaries_cache['timestamp'] = now

            self.send_json(data)
        except URLError as e:
            # Return cached data if available, even if stale
            if _boundaries_cache['data']:
                self.send_json(_boundaries_cache['data'])
            else:
                self.send_json({'error': f'Failed to fetch boundaries: {str(e)}'}, 502)
        except Exception as e:
            self.send_json({'error': f'Boundary fetch error: {str(e)}'}, 500)

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")

def main():
    print(f"""
╦ ╦┬┌┐┌┌┬┐┬ ┬┌─┐┬  ┬┌─┌─┐┬─┐
║║║││││ ││││├─┤│  ├┴┐├┤ ├┬┘
╚╩╝┴┘└┘─┴┘└┴┘┴ ┴┴─┘┴ ┴└─┘┴└─
Native Treaty Mapping Initiative

Starting server on http://{HOST}:{PORT}
API available at http://{HOST}:{PORT}/api/v1/
Static files from {STATIC_DIR}
    """)

    server = HTTPServer((HOST, PORT), WindwalkerHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()

if __name__ == '__main__':
    main()
