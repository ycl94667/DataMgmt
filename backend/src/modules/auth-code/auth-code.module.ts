import { Module } from '@nestjs/common';
import { AuthCodeService } from './auth-code.service.js';
import { AuthCodeController } from './auth-code.controller.js';

@Module({
  controllers: [AuthCodeController],
  providers: [AuthCodeService],
  exports: [AuthCodeService],
})
export class AuthCodeModule {}
