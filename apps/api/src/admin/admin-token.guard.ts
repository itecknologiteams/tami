import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";

export const ADMIN_TOKEN = "ADMIN_TOKEN";

export function createAdminToken(): string {
  const configured = process.env.TAMI_ADMIN_TOKEN?.trim();
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("TAMI_ADMIN_TOKEN is required in production");
  }
  return "dev-admin-token";
}

@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(@Inject(ADMIN_TOKEN) private readonly adminToken: string) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{headers?: {"x-admin-token"?: string | string[]}}>();
    const header = request.headers?.["x-admin-token"];
    const token = Array.isArray(header) ? header[0] : header;
    if (!token || !safeEquals(token, this.adminToken)) {
      throw new UnauthorizedException("Admin token is required");
    }
    return true;
  }
}

function safeEquals(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (candidateBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}
