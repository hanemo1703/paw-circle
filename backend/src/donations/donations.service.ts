import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DonationCampaign } from './entities/donation-campaign.entity';
import { Donation } from './entities/donation.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateDonationDto } from './dto/create-donation.dto';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(DonationCampaign) private campaignsRepo: Repository<DonationCampaign>,
    @InjectRepository(Donation) private donationsRepo: Repository<Donation>,
    private dataSource: DataSource,
  ) {}

  createCampaign(creatorId: string, dto: CreateCampaignDto) {
    const campaign = this.campaignsRepo.create({
      ...dto,
      images: dto.images ?? [],
      creatorId,
    });
    return this.campaignsRepo.save(campaign);
  }

  findAllCampaigns() {
    return this.campaignsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findCampaign(id: string) {
    const campaign = await this.campaignsRepo.findOne({
      where: { id },
      relations: ['donations'],
    });
    if (!campaign) {
      throw new NotFoundException('Không tìm thấy chiến dịch');
    }
    return campaign;
  }

  // Use a transaction to keep crediting the campaign and creating the
  // donation consistent with each other.
  async donate(campaignId: string, donorId: string, dto: CreateDonationDto) {
    return this.dataSource.transaction(async (manager) => {
      const campaign = await manager.findOne(DonationCampaign, { where: { id: campaignId } });
      if (!campaign) {
        throw new NotFoundException('Không tìm thấy chiến dịch');
      }

      const donation = manager.create(Donation, {
        ...dto,
        campaignId,
        donorId,
      });
      await manager.save(donation);

      campaign.currentAmount = Number(campaign.currentAmount) + Number(dto.amount);
      await manager.save(campaign);

      return donation;
    });
  }
}
