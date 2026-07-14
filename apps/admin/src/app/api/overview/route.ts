import { NextResponse } from "next/server";

const apiBaseUrl =
  process.env.TAMI_API_BASE_URL?.trim() || "http://127.0.0.1:4000";
const adminToken = process.env.TAMI_ADMIN_TOKEN?.trim() || "dev-admin-token";

export async function GET() {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/admin/overview`, {
      headers: {"x-admin-token": adminToken},
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {error: "The Tami API is unreachable"},
      {status: 503},
    );
  }
  if (!response.ok) {
    return NextResponse.json(
      {error: "The Tami API rejected the overview request"},
      {status: response.status},
    );
  }
  return NextResponse.json(await response.json());
}
