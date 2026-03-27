import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './common/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { RegionModule } from './modules/region/region.module.js';
import { ProjectModule } from './modules/project/project.module.js';
import { BatchModule } from './modules/batch/batch.module.js';
import { TagModule } from './modules/tag/tag.module.js';
import { VideoModule } from './modules/video/video.module.js';
import { AuthCodeModule } from './modules/auth-code/auth-code.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { DocumentModule } from './modules/document/document.module.js';
import { RecycleModule } from './modules/recycle/recycle.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { StatsModule } from './modules/stats/stats.module.js';
import { FrontModule } from './modules/front/front.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AdminModule,
    RegionModule,
    ProjectModule,
    BatchModule,
    TagModule,
    VideoModule,
    AuthCodeModule,
    UploadModule,
    DocumentModule,
    RecycleModule,
    AuditModule,
    StatsModule,
    FrontModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
