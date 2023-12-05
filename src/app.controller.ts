import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getMainRepply() {
    return this.appService.getAll();
  }

  @Get('swap/:chainId/:src/:dst/:amountIn')
  getAggSwap(@Param() params: any) {
    return this.appService.getAggSwap(params.chainId, params.src, params.dst, params.amountIn);
  }

}
