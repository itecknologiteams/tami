import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { DriverAuthService } from "./driver-auth.service";
import { AuthenticatedDriver } from "./driver-auth.types";

type DriverRequest = {
  headers?: { authorization?: string | string[] };
  driver?: AuthenticatedDriver;
};

@Injectable()
export class DriverAuthGuard implements CanActivate {
  constructor(private readonly authService: DriverAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<DriverRequest>();
    const authorization = request.headers?.authorization;
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    const token = header?.match(/^Bearer (.+)$/i)?.[1];

    if (!token) {
      throw new UnauthorizedException("Driver bearer token is required");
    }

    request.driver = await this.authService.authenticate(token);
    return true;
  }
}

export const CurrentDriver = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedDriver => {
    const request = context.switchToHttp().getRequest<DriverRequest>();
    if (!request.driver) {
      throw new UnauthorizedException("Driver session is required");
    }

    return request.driver;
  },
);
