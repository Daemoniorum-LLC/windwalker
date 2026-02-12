# Getting Started with Windwalker

Welcome, Jim! This guide will help you get Windwalker running on your computer.

## What is Windwalker?

Windwalker is a tool for exploring Native American treaties. It shows you:

- **Treaties** — The full text of all 375 ratified treaties
- **Maps** — Where treaty territories were located
- **Timeline** — How boundaries changed from 1778 to 1871
- **Sources** — Where each piece of information came from

Every piece of data shows how certain we are about it, so you always know what's verified and what needs more research.

---

## Before You Start

You'll need a few things installed. If you don't have these, ask Lilith for help:

1. **Sigil** — The programming language Windwalker is built with
2. **PostgreSQL** — The database that stores treaty information
3. **PostGIS** — Adds map features to the database

---

## Step 1: Set Up the Database

Open a terminal and run these commands:

```bash
# Create the database
createdb windwalker_staging

# Add the extensions we need
psql windwalker_staging -c "CREATE EXTENSION postgis;"
psql windwalker_staging -c "CREATE EXTENSION uuid-ossp;"

# Set up the tables
psql windwalker_staging < sourcing/migrations/001_staging_schema.sql
```

You should see output like:
```
CREATE EXTENSION
CREATE EXTENSION
CREATE TYPE
CREATE TABLE
...
```

---

## Step 2: Configure Your Environment

Tell Windwalker where to find the database:

```bash
export DATABASE_URL="postgres://localhost/windwalker_staging"
```

**Tip:** Add this line to your `~/.bashrc` file so you don't have to type it every time.

---

## Step 3: Load Treaty Data

First, let's load some treaty data from Kappler:

```bash
cd sourcing
sigil run-ws
```

This runs in "test mode" and loads 5 treaties. To load everything:

```bash
sigil run-ws -- --full
```

**Note:** Loading all treaties takes a while. Windwalker is respectful of the source websites, so it waits between requests.

---

## Step 4: Start the Server

Open a new terminal window and run:

```bash
cd api
export DATABASE_URL="postgres://localhost/windwalker_staging"
sigil run
```

You should see:
```
╦ ╦┬┌┐┌┌┬┐┬ ┬┌─┐┬  ┬┌─┌─┐┬─┐
║║║││││ ││││├─┤│  ├┴┐├┤ ├┬┘
╚╩╝┴┘└┘─┴┘└┴┘┴ ┴┴─┘┴ ┴└─┘┴└─
Native Treaty Mapping Initiative

Connecting to database...
Database connected (pool size: 10)
Starting server on http://127.0.0.1:8080
API available at http://127.0.0.1:8080/api/v1/
```

---

## Step 5: Open the Map

Open your web browser and go to:

```
http://localhost:8080
```

You should see the Windwalker map interface!

---

## Using the Interface

### The Map

- **Zoom** — Use the + and - buttons, or scroll with your mouse
- **Pan** — Click and drag to move around
- **Click a territory** — Shows treaty details in the side panel

### Treaty Colors

| Color | Meaning |
|-------|---------|
| Green | Treaty is still in effect |
| Red | Treaty was violated |
| Gray | Treaty was formally ended |

### Boundary Lines

| Line Style | Meaning |
|------------|---------|
| Solid line | We're confident about this boundary |
| Dashed line | This boundary is uncertain or disputed |

### The Certainty Badges

You'll see small badges next to data. Here's what they mean:

| Badge | Meaning |
|-------|---------|
| **!** | Verified — Multiple sources agree |
| **~** | Reported — From one good source |
| **?** | Uncertain — Needs more research |
| **‽** | Disputed — Sources disagree |

---

## Searching

Type in the search box to find:
- Treaty names (e.g., "Fort Laramie")
- Tribe names (e.g., "Cherokee")
- Locations (e.g., "Kansas")

---

## The Timeline

At the bottom of the screen is a timeline slider. Drag it to see how territories changed over time:

- **1778** — First treaty (Delaware)
- **1830** — Indian Removal Act
- **1851** — First Fort Laramie Treaty
- **1871** — End of treaty-making

Press the play button to watch boundaries change automatically.

---

## Viewing Treaty Details

Click any treaty on the map or in the list to see:

1. **Overview** — Key dates, status, tribes involved
2. **Parties** — Who signed (US commissioners and tribal signatories)
3. **Text** — The full treaty text (preamble and articles)
4. **Legal** — Known violations and related laws
5. **Sources** — Where this information came from

---

## If Something Goes Wrong

### "Database connection failed"

Make sure PostgreSQL is running:
```bash
pg_isready
```

If it says "no response", start PostgreSQL:
```bash
sudo systemctl start postgresql
```

### "Cannot find treaties"

Make sure you ran the data pipeline:
```bash
cd sourcing
sigil run-ws
```

### The map is blank

Check that the API server is running in another terminal:
```bash
cd api
sigil run
```

---

## Getting Help

If you run into problems:

1. Check the error message — it usually tells you what's wrong
2. Make sure all the services are running (database, API server)
3. Ask Lilith — they built this for you!

---

## What's Next?

Once you're comfortable with the basics:

- **Add NARA data** — Get original document scans (requires API key)
- **Import your spreadsheets** — We can convert your existing research
- **Export data** — Download treaty information for your own analysis

---

*This project was built with care for you and the important work you're doing documenting Native American treaty history.*
