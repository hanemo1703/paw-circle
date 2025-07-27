import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CampaignStatus, DonationCampaign } from './entities/donation-campaign.entity';
import { Donation } from './entities/donation.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateDonationDto } from './dto/create-donation.dto';

// Donors need a way to actually send money: either a full bank account (all three
// fields, so there's nothing ambiguous to transfer to) or an uploaded QR image.
// Having both is fine — this only rejects "some but not all" bank fields, or neither.
function assertFundingInfoComplete(campaign: {
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  qrImageUrl?: string;
}) {
  const bankFields = [campaign.bankName, campaign.bankAccountNumber, campaign.bankAccountHolder];
  const filledCount = bankFields.filter((v) => !!v && v.trim() !== '').length;
  if (filledCount > 0 && filledCount < 3) {
    throw new BadRequestException(
      'Vui lòng điền đầy đủ cả 3 thông tin ngân hàng: ngân hàng, số tài khoản và chủ tài khoản.',
    );
  }
  const hasCompleteBankInfo = filledCount === 3;
  const hasQrImage = !!campaign.qrImageUrl && campaign.qrImageUrl.trim() !== '';
  if (!hasCompleteBankInfo && !hasQrImage) {
    throw new BadRequestException(
      'Vui lòng cung cấp ảnh QR nhận ủng hộ hoặc đầy đủ thông tin ngân hàng để người ủng hộ có thể chuyển khoản.',
    );
  }
}

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(DonationCampaign) private campaignsRepo: Repository<DonationCampaign>,
    @InjectRepository(Donation) private donationsRepo: Repository<Donation>,
    private dataSource: DataSource,
  ) {}

  createCampaign(creatorId: string, dto: CreateCampaignDto) {
    assertFundingInfoComplete(dto);
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
      relations: ['donations', 'donations.donor', 'creator'],
    });
    if (!campaign) {
      throw new NotFoundException('Không tìm thấy chiến dịch');
    }

    if (campaign.creator) {
      delete (campaign.creator as any).password;
      delete (campaign.creator as any).email;
      delete (campaign.creator as any).phone;
      delete (campaign.creator as any).showPhonePublicly;
      delete (campaign.creator as any).showEmailPublicly;
    }

    // Public donor feed only exposes what the campaign page actually shows (name + time).
    // Amount and the transfer proof screenshot stay private — the screenshot in particular
    // can contain the donor's own bank statement details.
    campaign.donations = (campaign.donations ?? [])
      .map((donation) => ({
        id: donation.id,
        anonymous: donation.anonymous,
        message: donation.message,
        createdAt: donation.createdAt,
        donor: donation.anonymous
          ? undefined
          : donation.donor && { id: donation.donor.id, name: donation.donor.name, avatarUrl: donation.donor.avatarUrl },
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as any;

    (campaign as any).creatorCampaignCount = await this.campaignsRepo.count({
      where: { creatorId: campaign.creatorId },
    });

    return campaign;
  }

  async updateCampaign(id: string, userId: string, dto: UpdateCampaignDto) {
    const campaign = await this.campaignsRepo.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException('Không tìm thấy chiến dịch');
    }
    if (campaign.creatorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa chiến dịch này');
    }
    const merged = { ...campaign, ...dto };
    // A closed/completed campaign no longer takes donations, so it doesn't need
    // valid funding info — only enforce this while the campaign stays ACTIVE.
    if (merged.status === CampaignStatus.ACTIVE) {
      assertFundingInfoComplete(merged);
    }
    Object.assign(campaign, dto);
    return this.campaignsRepo.save(campaign);
  }

  async removeCampaign(id: string, userId: string) {
    const campaign = await this.campaignsRepo.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException('Không tìm thấy chiến dịch');
    }
    if (campaign.creatorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa chiến dịch này');
    }
    await this.campaignsRepo.remove(campaign);
  }

  // Use a transaction to keep crediting the campaign and creating the
  // donation consistent with each other.
  async donate(campaignId: string, donorId: string, dto: CreateDonationDto) {
    return this.dataSource.transaction(async (manager) => {
      const campaign = await manager.findOne(DonationCampaign, { where: { id: campaignId } });
      if (!campaign) {
        throw new NotFoundException('Không tìm thấy chiến dịch');
      }
      if (campaign.status !== CampaignStatus.ACTIVE) {
        throw new BadRequestException('Chiến dịch này hiện không nhận ủng hộ.');
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
