import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post as HttpPost,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DonationsService } from './donations.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateDonationDto } from './dto/create-donation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MAX_CAMPAIGN_IMAGES, MAX_IMAGE_SIZE_BYTES, campaignImagesStorage } from './images-upload.config';
import { VN_BANKS } from './vn-banks';

@Controller('donations')
export class DonationsController {
  constructor(private donationsService: DonationsService) {}

  @Get('banks')
  listBanks() {
    return VN_BANKS;
  }

  @UseGuards(JwtAuthGuard)
  @HttpPost('campaigns/upload-images')
  @UseInterceptors(FilesInterceptor('images', MAX_CAMPAIGN_IMAGES, { storage: campaignImagesStorage }))
  uploadImages(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE_BYTES, message: 'Mỗi ảnh tối đa 5MB.' }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp|gif)$/,
            skipMagicNumbersValidation: true,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    files: Express.Multer.File[],
  ) {
    return { urls: (files ?? []).map((f) => `/uploads/donations/${f.filename}`) };
  }

  @UseGuards(JwtAuthGuard)
  @HttpPost('campaigns')
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
  @Patch('campaigns/:id')
  updateCampaign(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.donationsService.updateCampaign(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('campaigns/:id')
  removeCampaign(@Req() req: any, @Param('id') id: string) {
    return this.donationsService.removeCampaign(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpPost('campaigns/:id/donate')
  donate(@Req() req: any, @Param('id') campaignId: string, @Body() dto: CreateDonationDto) {
    return this.donationsService.donate(campaignId, req.user.userId, dto);
  }
}
