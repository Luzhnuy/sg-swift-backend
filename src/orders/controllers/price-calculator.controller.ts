import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../../cms/roles-and-permissions/guards/permissions.guard';
import { OrdersPriceCalculatorService } from '../services/orders-price-calculator.service';
import { PermissionKeys } from '../providers/orders-config';
import { PriceCalculatorConstants } from '../entities/price-calculator-constant.entity';

@Controller('price-calculator')
export class PriceCalculatorController {

  constructor(
    private priceCalculatorService: OrdersPriceCalculatorService,
  ) {}

  @Get('')
  @UseGuards(PermissionsGuard(() => PermissionKeys.AllowViewPriceCalculatorConstants))
  getAll() {
    return this.priceCalculatorService.getConstantsList();
  }

  @Get('min-trip-count')
  private async getMinTripOrdersCount() {
    return this.priceCalculatorService.getConstant(PriceCalculatorConstants.TripMinOrderNumber);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard(() => PermissionKeys.AllowEditPriceCalculatorConstants))
  async save(
    @Param('id') id: string,
    @Body() { key, value }: { key: PriceCalculatorConstants, value: number },
  ) {
    await this.priceCalculatorService.setConstant(key, value);
    return { success: true };
  }

}
