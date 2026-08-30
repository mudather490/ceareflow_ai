import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/lib/types";

export function apiOk<T>(data: T, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json({ data, error: null }, { status: init?.status ?? 200, headers: init?.headers });
}

export function apiErr(
  code: ApiErrorCode,
  message: string,
  status: number,
  opts?: { field?: string }
) {
  return NextResponse.json(
    { data: null, error: { code, message, field: opts?.field } },
    { status }
  );
}
