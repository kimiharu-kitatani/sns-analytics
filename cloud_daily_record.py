from __future__ import annotations

import json
import re
import sys
from datetime import date
from typing import Any

import requests

from supabase_store import build_record, upsert_records


SOURCE = "github_actions"

PLATFORM_URLS = {
    "Instagram": "https://www.instagram.com/anken.kakutoku/?hl=ja",
    "YouTube": "https://www.youtube.com/@anken-kakutoku",
    "TikTok": "https://www.tiktok.com/@anken_kakutoku",
    "X": "https://x.com/engineer_banso",
    "LINE": "https://manager.line.biz/account/@165osnsj",
}


def build_headers() -> dict[str, str]:
    return {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/135.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }


def normalize_count(raw_value: Any) -> int | None:
    if raw_value is None:
        return None
    text = str(raw_value).strip()
    if not text:
        return None

    text = (
        text.replace(",", "")
        .replace(" ", "")
        .replace("\xa0", "")
        .replace("+", "")
        .replace("followers", "")
        .replace("follower", "")
        .replace("Followers", "")
        .replace("Follower", "")
        .replace("subscribers", "")
        .replace("subscriber", "")
        .replace("Subscribers", "")
        .replace("Subscriber", "")
        .replace("\u767b\u9332\u8005", "")
        .replace("\u30d5\u30a9\u30ed\u30ef\u30fc", "")
        .replace("\u4eba", "")
    )

    match = re.search(r"([0-9]+(?:\.[0-9]+)?)([KMBkmb]|\u4e07)?", text)
    if not match:
        return None

    number = float(match.group(1))
    suffix = (match.group(2) or "").lower()
    multiplier = 1
    if suffix == "k":
        multiplier = 1_000
    elif suffix == "m":
        multiplier = 1_000_000
    elif suffix == "b":
        multiplier = 1_000_000_000
    elif suffix == "\u4e07":
        multiplier = 10_000
    return int(number * multiplier)


def extract_count(patterns: list[str], *sources: str) -> int | None:
    for source in sources:
        if not source:
            continue
        for pattern in patterns:
            match = re.search(pattern, source, re.IGNORECASE | re.DOTALL)
            if not match:
                continue
            count = normalize_count(match.group(1))
            if count is not None:
                return count
    return None


def fetch_html(url: str) -> str:
    response = requests.get(url, headers=build_headers(), timeout=30)
    response.raise_for_status()
    return response.text


def fetch_instagram() -> int:
    html = fetch_html(PLATFORM_URLS["Instagram"])
    count = extract_count(
        [
            r'"edge_followed_by"\s*:\s*\{"count"\s*:\s*(\d+)\}',
            r'content="[^"]*?([0-9.,KMBkmb\u4e07]+)\s*Followers',
            r'content="[^"]*?\u30d5\u30a9\u30ed\u30ef\u30fc\s*([0-9.,KMBkmb\u4e07]+)',
            r'content="[^"]*?([0-9.,KMBkmb\u4e07]+)\s*\u30d5\u30a9\u30ed\u30ef\u30fc',
        ],
        html,
    )
    if count is None:
        raise RuntimeError("Instagram follower count was not found in the public page.")
    return count


def fetch_youtube() -> int:
    html = fetch_html(PLATFORM_URLS["YouTube"])
    count = extract_count(
        [
            r'"subscriberCountText"\s*:\s*\{.*?"simpleText"\s*:\s*"([^"]+)"',
            r'"subscriberCountText"\s*:\s*\{.*?"text"\s*:\s*"([^"]+)"',
            r'([0-9.,KMBkmb\u4e07]+)\s*subscribers',
            r'\u767b\u9332\u8005\u6570\s*([0-9.,KMBkmb\u4e07]+)',
        ],
        html,
    )
    if count is None:
        raise RuntimeError("YouTube subscriber count was not found in the public page.")
    return count


def fetch_tiktok() -> int:
    html = fetch_html(PLATFORM_URLS["TikTok"])
    count = extract_count(
        [
            r'"followerCount"\s*:\s*(\d+)',
            r'"fans"\s*:\s*(\d+)',
            r'([0-9.,KMBkmb\u4e07]+)\s*Followers',
        ],
        html,
    )
    if count is None:
        raise RuntimeError("TikTok follower count was not found in the public page.")
    return count


def fetch_x() -> int:
    html = fetch_html(PLATFORM_URLS["X"])
    count = extract_count(
        [
            r'"followers_count"\s*:\s*(\d+)',
            r'([0-9.,KMBkmb\u4e07]+)\s*Followers',
            r'Followers\s*([0-9.,KMBkmb\u4e07]+)',
        ],
        html,
    )
    if count is None:
        raise RuntimeError("X follower count was not found in the public page.")
    return count


def fetch_line() -> int:
    raise RuntimeError("LINE requires login and is not supported by GitHub Actions public fetch.")


FETCHERS = {
    "Instagram": fetch_instagram,
    "YouTube": fetch_youtube,
    "TikTok": fetch_tiktok,
    "X": fetch_x,
    "LINE": fetch_line,
}


def collect_records(target_date: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    records: list[dict[str, Any]] = []
    summary: dict[str, Any] = {"date": target_date, "success": {}, "failed": {}}

    for platform, fetcher in FETCHERS.items():
        try:
            count = fetcher()
            records.append(
                build_record(
                    platform=platform,
                    record_date=target_date,
                    follower_count=count,
                    source=SOURCE,
                    status="success",
                    error_message=None,
                )
            )
            summary["success"][platform] = count
            print(f"{platform}: {count}")
        except Exception as error:
            message = str(error)
            records.append(
                build_record(
                    platform=platform,
                    record_date=target_date,
                    follower_count=None,
                    source=SOURCE,
                    status="failed",
                    error_message=message,
                )
            )
            summary["failed"][platform] = message
            print(f"{platform}: failed -> {message}")

    return records, summary


def main() -> int:
    target_date = date.today().isoformat()
    records, summary = collect_records(target_date)
    saved = upsert_records(records)
    summary["saved_rows"] = len(saved)

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not summary["success"]:
        print("No follower counts were collected. See failed messages above.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
