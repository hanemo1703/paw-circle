import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateDonationDto } from './dto/create-donation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('donations')
export class DonationsController {
  constructor(private donationsService: DonationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('campaigns')
  createCampaign(@Req() req: any, @Body() dto: CreateCampaignDto) {
    return this.donationsService.createCampaign(req.user.userId, dto);
  }

  @Get('campaigns')
  findAllCampaigns() {
    return this.donationsService.findAllCampaigns();
  }

  @Get('campaigns/:id')
  findCampaign(@Param('id') id: string) {
    return this.donationsService.findCampaign(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('campaigns/:id/donate')
  donate(@Req() req: any, @Param('id') campaignId: string, @Body() dto: CreateDonationDto) {
    return this.donationsService.donate(campaignId, req.user.userId, dto);
  }
}
