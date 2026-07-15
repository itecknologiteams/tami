import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const trustProxy = process.env.TAMI_TRUST_PROXY?.trim();
  if (trustProxy) {
    app.set(
      "trust proxy",
      trustProxy === "true" || trustProxy === "false"
        ? trustProxy === "true"
        : Number(trustProxy),
    );
  }
  const corsOrigins = process.env.TAMI_CORS_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  app.enableCors(
    corsOrigins != null && corsOrigins.length > 0
      ? {origin: corsOrigins}
      : undefined,
  );
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

void bootstrap();
