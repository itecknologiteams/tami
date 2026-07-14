import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
