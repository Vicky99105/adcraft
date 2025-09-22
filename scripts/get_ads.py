#!/usr/bin/env python3
"""Fetch Meta ads for brand page IDs and append them to the ads worksheet."""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import gspread
import requests
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

# --- Configuration ---------------------------------------------------------------------------
# Google Sheets
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]
SPREADSHEET_ID = "1DQbD5NSZsdHJ3ABFXSslEgbEuvLi5tZAA19cuMb9ljE"
BRANDS_WORKSHEET_TITLE = "brands"
ADS_WORKSHEET_TITLE = "ads"
BRAND_NAME_FIELD = "Brand"
PAGE_ID_FIELD = "Page_id"
BRAND_CATEGORY_FIELD = "Category"
BRAND_START_ROW = 2  # 1-based row index (including header row)
MAX_BRAND_ROWS: Optional[int] = None  # Set to None to process all rows

# Meta Graph API
GRAPH_API_VERSION = "v23.0"
API_BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}/ads_archive"
ACCESS_TOKEN_ENV_VAR = "EAAKoCQFjfqQBPuzaPFgMymwZBMZBtsn9khelZBYggLNDNrZCZCzzWcBKqJ2GfE98HH0Ru9nmiZAqWzZC164Yf9vPno9n1Xy8lcEyX5w3SLqjTjsBUPbyUG8sCaHzZBo2ltbQ9jLg8bEi25l9bepcgPWqJZCVEzwdSG2qts76hTZC8UbszKwB2InOOSAvbG6v5uHZCnH5DknDXha8B1RxIZBkoypTG99Txn0dZBNyKTY0uJvf5V3ZCKL2RB"
ACCESS_TOKEN_DEFAULT = "EAAKoCQFjfqQBPuzaPFgMymwZBMZBtsn9khelZBYggLNDNrZCZCzzWcBKqJ2GfE98HH0Ru9nmiZAqWzZC164Yf9vPno9n1Xy8lcEyX5w3SLqjTjsBUPbyUG8sCaHzZBo2ltbQ9jLg8bEi25l9bepcgPWqJZCVEzwdSG2qts76hTZC8UbszKwB2InOOSAvbG6v5uHZCnH5DknDXha8B1RxIZBkoypTG99Txn0dZBNyKTY0uJvf5V3ZCKL2RB"  # Optional hard-coded fallback if env var is absent
COUNTRY_CODES = [
    "AT",  # Austria
    "BE",  # Belgium
    "BG",  # Bulgaria
    "HR",  # Croatia
    "CY",  # Cyprus
    "CZ",  # Czech Republic
    "DK",  # Denmark
    "EE",  # Estonia
    "FI",  # Finland
    "FR",  # France
    "DE",  # Germany
    "GR",  # Greece
    "HU",  # Hungary
    "IE",  # Ireland
    "IT",  # Italy
    "LV",  # Latvia
    "LT",  # Lithuania
    "LU",  # Luxembourg
    "MT",  # Malta
    "NL",  # Netherlands
    "PL",  # Poland
    "PT",  # Portugal
    "RO",  # Romania
    "SK",  # Slovakia
    "SI",  # Slovenia
    "ES",  # Spain
    "SE",  # Sweden
    "GB",  # United Kingdom
    "BR",  # Brazil
    # Added USA and other major industrial/developed countries:
    "US",  # United States
    "CA",  # Canada
    "JP",  # Japan
    "AU",  # Australia
    "NZ",  # New Zealand
    "CH",  # Switzerland
    "NO",  # Norway
    "IS",  # Iceland
    "KR",  # South Korea
    "SG",  # Singapore
    "IL",  # Israel
    "CN",  # China
    "IN",  # India
    "MX",  # Mexico
    "AR",  # Argentina
    "ZA",  # South Africa
    "RU",  # Russia
    "SA",  # Saudi Arabia
    "ID",  # Indonesia
    "TR",  # Turkey
    "TH",  # Thailand
    "MY",  # Malaysia
    "CL",  # Chile
    "AE",  # United Arab Emirates
]

REQUEST_FIELDS = [
    "id",
    "page_name",
    "page_id",
    "ad_creation_time",
    "ad_creative_bodies",
    "ad_creative_link_captions",
    "ad_creative_link_descriptions",
    "ad_creative_link_titles",
    "ad_delivery_start_time",
    "ad_delivery_stop_time",
    "ad_snapshot_url",
    "currency",
    "estimated_audience_size",
    "eu_total_reach",
    "br_total_reach",
    "impressions",
    "languages",
    "publisher_platforms",
    "spend",
    "demographic_distribution",
    "delivery_by_region",
    "target_locations",
    "total_reach_by_location",
]
MEDIA_TYPE = "IMAGE"
API_PAGE_SIZE = 50
REQUEST_TIMEOUT = 60
MAX_CELL_LENGTH = 49000  # Slightly under Sheets 50k char limit

# Fetch window
DAYS_BACK = 30  # Number of days of ads to keep (last 1 month by default)

# Logging configuration
DEFAULT_LOG_LEVEL = "INFO"

# Output columns for the ads worksheet (in order)
ADS_COLUMNS = [
    "category",
] + REQUEST_FIELDS + [
    "ad_data_raw",
    "fetched_at",
]


# --- Helpers ---------------------------------------------------------------------------------

def load_environment() -> None:
    """Load environment variables from project and scripts directories."""
    load_dotenv()
    scripts_env = Path(__file__).resolve().parent / ".env"
    if scripts_env.exists():
        load_dotenv(scripts_env, override=False)


def resolve_credentials_path(raw_path: str) -> Path:
    """Return an absolute path to the Google credentials file."""
    candidate = Path(raw_path).expanduser()
    if candidate.exists():
        return candidate

    scripts_candidate = Path(__file__).resolve().parent / raw_path
    if scripts_candidate.exists():
        return scripts_candidate

    raise FileNotFoundError(
        "Unable to locate Google credentials file at "
        f"'{raw_path}'. Checked current working directory and scripts directory."
    )


def build_sheet_client(credentials_path: Path) -> gspread.Client:
    creds = Credentials.from_service_account_file(str(credentials_path), scopes=SCOPES)
    return gspread.authorize(creds)


def column_letter(index: int) -> str:
    """Convert a 1-based column index into its sheet column letter."""
    result = []
    while index:
        index, remainder = divmod(index - 1, 26)
        result.append(chr(65 + remainder))
    return "".join(reversed(result))


def ensure_column(headers: List[str], header_map: Dict[str, int], worksheet, header_name: str) -> int:
    """Ensure a column exists for header_name and return its index."""
    if header_name in header_map:
        return header_map[header_name]

    new_index = len(headers) + 1
    header_cell = f"{column_letter(new_index)}1"
    current_col_count = worksheet.col_count
    if new_index > current_col_count:
        worksheet.add_cols(new_index - current_col_count)

    worksheet.update(range_name=header_cell, values=[[header_name]])
    headers.append(header_name)
    header_map[header_name] = new_index
    logging.debug("Created new column '%s' at %s", header_name, header_cell)
    return new_index


def ensure_columns(worksheet, columns: Iterable[str]) -> List[str]:
    """Ensure the worksheet has the required columns and return the updated header list."""
    headers = worksheet.row_values(1)
    header_map = {header: idx + 1 for idx, header in enumerate(headers) if header}

    for column in columns:
        ensure_column(headers, header_map, worksheet, column)

    return headers


def parse_datetime(value: Optional[str]) -> Optional[datetime]:
    """Parse a Meta datetime string/date into a timezone-aware UTC datetime."""
    if not value:
        return None

    value = value.strip()
    if not value:
        return None

    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        if len(value) == 10 and value.count("-") == 2 and "T" not in value:
            parsed = datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        else:
            parsed = datetime.fromisoformat(value)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        logging.debug("Unable to parse datetime value: %s", value)
        return None


def normalize_value(value: Any) -> str:
    """Convert complex values into a sheet-friendly string representation."""
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        combined = "\n".join(normalize_value(item) for item in value)
        return _clip_value(combined)
    if isinstance(value, dict):
        try:
            return _clip_value(json.dumps(value, ensure_ascii=False))
        except (TypeError, ValueError):
            return _clip_value(str(value))
    return _clip_value(str(value))


def _clip_value(text: str) -> str:
    if len(text) <= MAX_CELL_LENGTH:
        return text
    return text[: MAX_CELL_LENGTH - 1] + "…"


def fetch_ads_for_page(
    page_id: str,
    session: requests.Session,
    cutoff: datetime,
    access_token: str,
) -> List[Dict[str, Any]]:
    """Fetch ads for a single page_id until the cutoff date is reached."""
    ads: List[Dict[str, Any]] = []
    params = {
        "access_token": access_token,
        "ad_reached_countries": json.dumps(COUNTRY_CODES),
        "fields": ",".join(REQUEST_FIELDS),
        "media_type": MEDIA_TYPE,
        "search_page_ids": json.dumps([page_id]),
        "limit": API_PAGE_SIZE,
    }

    if not params["access_token"]:
        raise ValueError("Access token is missing for the Meta API request.")

    next_url: Optional[str] = None
    page_index = 0

    while True:
        try:
            if next_url:
                response = session.get(next_url, timeout=REQUEST_TIMEOUT)
            else:
                response = session.get(API_BASE_URL, params=params, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
        except requests.HTTPError as exc:
            logging.error("API request failed for page_id %s: %s", page_id, exc)
            break
        except requests.RequestException as exc:
            logging.error("Network error while fetching ads for %s: %s", page_id, exc)
            break

        try:
            payload = response.json()
        except ValueError:
            logging.error("Failed to decode JSON response while fetching ads for %s", page_id)
            break
        if "error" in payload:
            logging.error("Meta API returned an error for %s: %s", page_id, payload["error"])
            break

        data = payload.get("data", [])
        if not data:
            break

        page_index += 1
        parsed_batch: List[Dict[str, Any]] = []
        comparison_times: List[Optional[datetime]] = []
        for ad in data:
            delivery_start = parse_datetime(ad.get("ad_delivery_start_time"))
            comparison_time = delivery_start or parse_datetime(ad.get("ad_creation_time"))
            parsed_batch.append(ad)
            comparison_times.append(comparison_time)

        if not parsed_batch:
            break

        # Determine newest and oldest timestamps available on this page.
        first_time = next((ts for ts in comparison_times if ts is not None), None)
        oldest_time = next((ts for ts in reversed(comparison_times) if ts is not None), None)

        filtered_batch: List[Dict[str, Any]] = []
        for ad, comparison_time in zip(parsed_batch, comparison_times):
            if comparison_time and comparison_time < cutoff:
                continue
            filtered_batch.append(ad)

        if filtered_batch:
            ads.extend(filtered_batch)
        elif page_index == 1:
            logging.info(
                "No ads within cutoff for page %s; using first page API results.",
                page_id,
            )
            ads.extend(parsed_batch)
            break

        # If the newest ad on the first page is already outside the cutoff, stop here.
        if page_index == 1 and first_time and first_time < cutoff:
            logging.info(
                "Skipping further pages for %s because first ad predates cutoff.",
                page_id,
            )
            break

        if oldest_time and oldest_time < cutoff:
            break

        paging = payload.get("paging", {})
        next_url = paging.get("next")
        if not next_url:
            break

    return ads


def build_session(access_token: str) -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "application/json",
        }
    )
    return session


def append_ads_to_sheet(
    worksheet,
    ads: List[Dict[str, Any]],
    brand_name: str,
    page_id: str,
    brand_row_number: int,
    brand_category: str,
) -> None:
    """Append ads data to the worksheet using the predefined ADS_COLUMNS order."""
    headers = ensure_columns(worksheet, ADS_COLUMNS)

    fetched_at = datetime.now(timezone.utc).isoformat()
    rows = []
    for ad in ads:
        row_dict: Dict[str, Any] = {field: ad.get(field, "") for field in REQUEST_FIELDS}
        row_dict.update(
            {
                "category": brand_category,
                "ad_data_raw": ad,
                "fetched_at": fetched_at,
            }
        )

        row_values = [normalize_value(row_dict.get(header, "")) for header in headers]
        rows.append(row_values)

    if rows:
        worksheet.append_rows(rows, value_input_option="RAW")
        logging.info(
            "Appended %d ads for page_id %s (brand '%s') to worksheet '%s'",
            len(rows),
            page_id,
            brand_name,
            ADS_WORKSHEET_TITLE,
        )


def main() -> int:
    load_environment()

    log_level_name = os.getenv("GET_ADS_LOG_LEVEL", DEFAULT_LOG_LEVEL)
    log_level = getattr(logging, str(log_level_name).upper(), logging.INFO)
    logging.basicConfig(level=log_level, format="%(asctime)s %(levelname)s %(message)s")

    access_token = os.getenv(ACCESS_TOKEN_ENV_VAR, ACCESS_TOKEN_DEFAULT).strip()
    if not access_token:
        logging.error(
            "Access token is missing. Set the %s environment variable or update ACCESS_TOKEN_DEFAULT.",
            ACCESS_TOKEN_ENV_VAR,
        )
        return 1

    credentials_path_value = os.getenv("GOOGLE_SHEETS_CREDENTIALS_PATH")
    if not credentials_path_value:
        logging.error("GOOGLE_SHEETS_CREDENTIALS_PATH is not set in the environment")
        return 1

    try:
        credentials_path = resolve_credentials_path(credentials_path_value)
    except FileNotFoundError as exc:
        logging.error(str(exc))
        return 1

    try:
        client = build_sheet_client(credentials_path)
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        brands_sheet = spreadsheet.worksheet(BRANDS_WORKSHEET_TITLE)
        ads_sheet = spreadsheet.worksheet(ADS_WORKSHEET_TITLE)
    except Exception as exc:
        logging.error("Failed to open spreadsheet: %s", exc)
        return 1

    session = build_session(access_token)
    cutoff = datetime.now(timezone.utc) - timedelta(days=DAYS_BACK)

    records = brands_sheet.get_all_records()
    if not records:
        logging.info("No brand records found in worksheet '%s'", BRANDS_WORKSHEET_TITLE)
        return 0

    processed = 0
    for index, record in enumerate(records, start=2):
        if index < BRAND_START_ROW:
            continue
        if MAX_BRAND_ROWS is not None and processed >= MAX_BRAND_ROWS:
            break

        page_id = str(record.get(PAGE_ID_FIELD, "")).strip()
        if not page_id:
            continue

        brand_name = str(record.get(BRAND_NAME_FIELD, "")).strip()
        logging.info("Fetching ads for page_id %s (brand '%s')", page_id, brand_name or "<unknown>")

        ads = fetch_ads_for_page(page_id, session, cutoff, access_token)
        if not ads:
            logging.info("No recent ads found for page_id %s", page_id)
            continue

        brand_category = str(record.get(BRAND_CATEGORY_FIELD, "")).strip()

        append_ads_to_sheet(ads_sheet, ads, brand_name, page_id, index, brand_category)
        processed += 1

    logging.info("Finished processing %d brand rows.", processed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
