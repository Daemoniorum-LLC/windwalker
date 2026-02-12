#!/usr/bin/env python3
"""
Kappler's Indian Affairs: Laws and Treaties Scraper

Scrapes treaty data from Oklahoma State University's CONTENTdm digital archive
of Charles J. Kappler's "Indian Affairs: Laws and Treaties" Volume II.

Source: https://dc.library.okstate.edu/digital/collection/kapplers
Status: Public Domain
Coverage: 370+ treaties (1778-1883)
"""

import re
import time
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
import ssl
import os

# Configuration
BASE_URL = "https://dc.library.okstate.edu"
API_BASE = f"{BASE_URL}/digital/bl/dmwebservices/index.php"
COLLECTION = "kapplers"
VOL2_POINTER = "29743"  # Volume 2 (Treaties)
SOURCE_ID = "kappler"
SOURCE_NAME = "Kappler's Indian Affairs: Laws and Treaties"
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://localhost/windwalker_staging')

# Respectful scraping settings
MIN_DELAY_MS = 500
USER_AGENT = "Windwalker/0.1.0 (Native Treaty Mapping Initiative)"


def fetch_json(url):
    """Fetch JSON from a URL with respectful delay"""
    time.sleep(MIN_DELAY_MS / 1000.0)

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = Request(url, headers={'User-Agent': USER_AGENT})

    try:
        with urlopen(req, context=ctx, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except (URLError, HTTPError, json.JSONDecodeError) as e:
        print(f"  Error fetching {url}: {e}")
        return None


def get_treaty_list():
    """Get list of all treaties from Volume 2"""
    print("Fetching treaty index from CONTENTdm API...")

    url = f"{API_BASE}?q=dmGetCompoundObjectInfo/{COLLECTION}/{VOL2_POINTER}/json"
    data = fetch_json(url)

    if not data:
        return []

    treaties = []

    # Navigate the nested structure
    def extract_pages(node, treaties):
        if isinstance(node, dict):
            if 'page' in node:
                pages = node['page']
                if isinstance(pages, list):
                    for page in pages:
                        if 'pagetitle' in page and 'pageptr' in page:
                            treaties.append({
                                'title': page['pagetitle'],
                                'pointer': page['pageptr'],
                                'file': page.get('pagefile', '')
                            })
                elif isinstance(pages, dict):
                    if 'pagetitle' in pages:
                        treaties.append({
                            'title': pages['pagetitle'],
                            'pointer': pages['pageptr'],
                            'file': pages.get('pagefile', '')
                        })
            if 'node' in node:
                nodes = node['node']
                if isinstance(nodes, list):
                    for n in nodes:
                        extract_pages(n, treaties)
                elif isinstance(nodes, dict):
                    extract_pages(nodes, treaties)

    extract_pages(data, treaties)

    # Also check top-level node
    if 'node' in data:
        extract_pages(data['node'], treaties)

    print(f"Found {len(treaties)} treaties")
    return treaties


def get_treaty_metadata(pointer):
    """Get full metadata for a treaty"""
    url = f"{API_BASE}?q=dmGetItemInfo/{COLLECTION}/{pointer}/json"
    return fetch_json(url)


def parse_date(date_str):
    """Parse a date string into a date object"""
    if not date_str:
        return None

    # Extract year from various formats
    year_match = re.search(r'(1[78]\d{2})', str(date_str))
    if year_match:
        year = int(year_match.group(1))
        # Try to extract month and day
        date_match = re.search(
            r'(January|February|March|April|May|June|July|August|'
            r'September|October|November|December)\s+(\d{1,2})',
            str(date_str), re.IGNORECASE
        )
        if date_match:
            month_names = {
                'january': 1, 'february': 2, 'march': 3, 'april': 4,
                'may': 5, 'june': 6, 'july': 7, 'august': 8,
                'september': 9, 'october': 10, 'november': 11, 'december': 12
            }
            month = month_names.get(date_match.group(1).lower(), 1)
            day = int(date_match.group(2))
            try:
                return datetime(year, month, day).date()
            except ValueError:
                return datetime(year, 1, 1).date()
        return datetime(year, 1, 1).date()

    return None


def extract_tribes_from_title(title):
    """Extract tribal names from treaty title"""
    tribes = []

    # Pattern: "Treaty with the X, 1778"
    match = re.search(r'Treaty with the ([^,]+)', title, re.IGNORECASE)
    if match:
        tribe_part = match.group(1).strip()
        # Handle "etc." cases
        tribe_part = re.sub(r',?\s*etc\.?', '', tribe_part)
        # Split on "and" or ","
        for tribe in re.split(r'\s+and\s+|,\s*', tribe_part):
            tribe = tribe.strip()
            if tribe and len(tribe) > 2:
                tribes.append(tribe)

    return tribes


def get_db():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def ensure_source_exists(conn):
    """Ensure the Kappler data source exists in the database"""
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO data_sources (source_id, name, source_type, base_url, reliability)
        VALUES (%s, %s, 'kappler', %s, 0.98)
        ON CONFLICT (source_id) DO UPDATE SET
            name = EXCLUDED.name,
            base_url = EXCLUDED.base_url,
            reliability = EXCLUDED.reliability,
            last_scraped = NOW()
        RETURNING id
    """, (SOURCE_ID, SOURCE_NAME, BASE_URL))

    result = cur.fetchone()
    conn.commit()
    return result['id']


def insert_treaty(conn, source_id, treaty_data):
    """Insert a treaty in the database"""
    cur = conn.cursor()

    date_signed = parse_date(treaty_data.get('date'))
    tribes_json = json.dumps(treaty_data.get('tribes', []))

    try:
        cur.execute("""
            INSERT INTO raw_treaties (
                source_id, source_url, title,
                date_signed_text, date_signed,
                tribal_parties_text,
                kappler_volume, kappler_page,
                raw_html, is_validated, scraped_at
            ) VALUES (
                %s, %s, %s,
                %s, %s,
                %s::jsonb,
                %s, %s,
                '', true, NOW()
            )
            RETURNING id
        """, (
            source_id,
            treaty_data['url'],
            treaty_data['title'],
            treaty_data.get('date'),
            date_signed,
            tribes_json,
            2,  # Volume 2
            treaty_data.get('page_num'),
        ))

        result = cur.fetchone()
        conn.commit()
        return result['id'] if result else None
    except Exception as e:
        conn.rollback()
        raise e


def main():
    """Main scraping function"""
    print("""
    ╦╔═┌─┐┌─┐┌─┐┬  ┌─┐┬─┐  ╔═╗┌─┐┬─┐┌─┐┌─┐┌─┐┬─┐
    ╠╩╗├─┤├─┘├─┘│  ├┤ ├┬┘  ╚═╗│  ├┬┘├─┤├─┘├┤ ├┬┘
    ╩ ╩┴ ┴┴  ┴  ┴─┘└─┘┴└─  ╚═╝└─┘┴└─┴ ┴┴  └─┘┴└─
    Indian Affairs: Laws and Treaties - Volume II
    via Oklahoma State University CONTENTdm
    """)

    # Connect to database
    print("Connecting to database...")
    conn = get_db()
    source_id = ensure_source_exists(conn)
    print(f"Source ID: {source_id}")

    # Clear existing Kappler treaties to avoid duplicates with old sample data
    cur = conn.cursor()
    cur.execute("DELETE FROM raw_treaties WHERE source_id = %s", (source_id,))
    conn.commit()
    print("Cleared existing Kappler treaties")

    # Fetch treaty list
    treaties = get_treaty_list()

    if not treaties:
        print("No treaties found!")
        return

    # Process each treaty
    success_count = 0
    error_count = 0

    for i, treaty in enumerate(treaties):
        title = treaty['title']
        pointer = treaty['pointer']

        print(f"\n[{i+1}/{len(treaties)}] {title[:60]}...")

        # Extract date from title
        date_match = re.search(r',\s*(1[78]\d{2})', title)
        date_text = date_match.group(1) if date_match else None

        # Extract tribes from title
        tribes = extract_tribes_from_title(title)

        # Build URL
        url = f"{BASE_URL}/digital/collection/{COLLECTION}/id/{pointer}"

        treaty_data = {
            'title': title,
            'url': url,
            'date': date_text,
            'tribes': tribes,
            'page_num': int(pointer) if pointer.isdigit() else None,
        }

        try:
            treaty_id = insert_treaty(conn, source_id, treaty_data)
            if treaty_id:
                print(f"  Saved: {title[:50]}")
                if tribes:
                    print(f"  Tribes: {', '.join(tribes[:3])}")
                success_count += 1
            else:
                error_count += 1
        except Exception as e:
            print(f"  Error: {e}")
            error_count += 1

    conn.close()

    print(f"\n{'='*50}")
    print(f"Scraping complete!")
    print(f"  Successful: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Total: {len(treaties)}")


if __name__ == '__main__':
    main()
