import { NestFactory } from "@nestjs/core";
import { RoleSeedService } from "./user-role/role-seed.service";
import { SeedModule } from "./seed.module";
import { StatusSeedService } from "./user-status/status-seed.service";
import { UserSeedService } from "./user/user-seed.service";
import { CooperatedSeedService } from "./cooperated/cooperated-seed.service";

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  // run
  await app.get(RoleSeedService).run();
  await app.get(StatusSeedService).run();
  await app.get(UserSeedService).run();
  await app.get(CooperatedSeedService).run();

  await app.close();
};

void runSeed();
