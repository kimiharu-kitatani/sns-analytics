from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import requests


DEFAULT_TABLE = "sns_follower_records"


class SupabaseConfigError(RuntimeError):
    pass


def get_supabase_config() -> tuple[str, str, str]:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_KEY")
        or ""
    )
    table = os.environ.get("SUPABASE_TABLE") or DEFAULT_TABLE

    if not url:
        raise SupabaseConfigError("SUPABASE_URL is not set.")
    if not key:
        raise SupabaseConfigError("SUPABASE_SERVICE_ROLE_KEY is not set.")

    return url, key, table


def build_record(
    *,
    platform: str,
    record_date: str,
    follower_count: int | None,
    source: str,
    status: str,
    error_message: str | None = None,
) -> dict[str, Any]:
    return {
        "platform": platform,
        "record_date": record_date,
        "follower_count": follower_count,
        "source": source,
        "status": status,
        "error_message": error_message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def upsert_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not records:
        return []

    url, key, table = get_supabase_config()
    endpoint = f"{url}/rest/v1/{table}"
    response = requests.post(
        endpoint,
        params={"on_conflict": "platform,record_date,status"},
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        },
        json=records,
        timeout=30,
    )
    response.raise_for_status()
    if not response.content:
        return []
    return response.json()
