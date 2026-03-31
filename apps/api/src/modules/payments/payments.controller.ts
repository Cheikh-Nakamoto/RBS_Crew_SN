import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  /**
   * Stripe webhook — raw body parsing is configured in main.ts.
   * TODO: verify Stripe signature and handle events (payment_intent.succeeded, etc.)
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint (stub)' })
  webhook(@Headers('stripe-signature') _sig: string, @Body() _body: unknown) {
    return { received: true };
  }

  /**
   * TODO: create Stripe checkout session and return { sessionId, url }
   */
  @Post('create-checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session (stub — not yet configured)' })
  createCheckout(@CurrentUser() _user: JwtPayload, @Body() _body: unknown) {
    return { sessionId: null, message: 'Stripe not configured' };
  }
}
