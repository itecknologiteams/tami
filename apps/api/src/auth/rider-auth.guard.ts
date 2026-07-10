import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthenticatedRider } from "./auth.types";
import { AuthService } from "./auth.service";

type RiderRequest = {
  headers?: { authorization?: string | string[] };
  rider?: AuthenticatedRider;
};

@Injectable()
export class RiderAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RiderRequest>();
    const authorization = request.headers?.authorization;
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    const token = header?.match(/^Bearer (.+)$/i)?.[1];

    if (!token) {
      throw new UnauthorizedException("Rider bearer token is required");
    }

    request.rider = await this.authService.authenticate(token);
    return true;
  }
}

export const CurrentRider = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedRider => {
    const request = context.switchToHttp().getRequest<RiderRequest>();
    if (!request.rider) {
      throw new UnauthorizedException("Rider session is required");
    }

    return request.rider;
  },
);
