import { Module } from '@nestjs/common';
import { PressController } from './press.controller';
import { PressService } from './press.service';

@Module({
  controllers: [PressController],
  providers: [PressService],
})
export class PressModule {}
