import { Module } from "@nestjs/common";
import { CadController } from "./cad.controller";
import { CadService } from "./cad.service";
import { BullModule } from "@nestjs/bullmq";
import { HttpModule } from "@nestjs/axios";
import { FilesModule } from "../files/files.module";
import { CadProcessor } from "./cad.processor";
import { CadConversionController } from "./cad-conversion.controller";
import { CadConversionService } from "./cad-conversion.service";

@Module({
  imports: [
    HttpModule.register({
      timeout: 120000, // 2 minutes timeout for CAD operations including conversion
      maxRedirects: 5,
    }),
    FilesModule,
  ],
  controllers: [CadController, CadConversionController],
  providers: [CadService, CadProcessor, CadConversionService],
  exports: [CadService, CadConversionService],
})
export class CadModule {}
