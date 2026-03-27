import { Module, forwardRef } from '@nestjs/common';
import { FrontService } from './front.service.js';
import { FrontController } from './front.controller.js';
import { AuthCodeModule } from '../auth-code/auth-code.module.js';

@Module({
  imports: [forwardRef(() => AuthCodeModule)],
  controllers: [FrontController],
  providers: [FrontService],
  exports: [FrontService],
})
export class FrontModule {}
