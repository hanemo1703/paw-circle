import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CampaignStatus, DonationCampaign } from './entities/donation-campaign.entity';
import { Donation } from './entities/donation.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateDonationDto } from './dto/create-donation.dto';
import { QueryCampaignDto } from './dto/query-campaign.dto';
import { QueryDonationsDto } from './dto/query-donations.dto';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { MessagesGateway } from '../messages/messages.gateway';

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
    private notificationsService: NotificationsService,
    private messagesGateway: MessagesGateway,
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

  async findAllCampaigns(query: QueryCampaignDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 6;

    const qb = this.campaignsRepo.createQueryBuilder('campaign');

    if (query.status) {
      const statuses = query.status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length > 0) {
        qb.andWhere('campaign.status IN (:...statuses)', { statuses });
      }
    }

    if (query.category) {
      const categories = query.category
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      if (categories.length > 0) {
        qb.andWhere('campaign.category IN (:...categories)', { categories });
      }
    }

    if (query.search) {
      qb.andWhere('campaign.title ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.sort === 'deadline') {
      // NULLS LAST so campaigns without a deadline sink to the bottom instead of
      // sorting first (Postgres defaults NULLS to sort last on ASC, but be explicit).
      qb.orderBy('campaign.deadline', 'ASC', 'NULLS LAST');
    } else if (query.sort === 'progress') {
      qb.addSelect(
        'CASE WHEN campaign.targetAmount IS NULL OR campaign.targetAmount = 0 THEN NULL ELSE campaign.currentAmount / campaign.targetAmount END',
        'progress',
      ).orderBy('progress', 'DESC', 'NULLS LAST');
    } else {
      qb.orderBy('campaign.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findCampaign(id: string) {
    const campaign = await this.campaignsRepo.findOne({
      where: { id },
      relations: ['creator'],
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

    (campaign as any).creatorCampaignCount = await this.campaignsRepo.count({
      where: { creatorId: campaign.creatorId },
    });

    return campaign;
  }

  // Paginated separately from findCampaign — a heavily-donated campaign shouldn't pull
  // every donation + donor row into memory just to show a page of the donor feed.
  async findCampaignDonations(campaignId: string, query: QueryDonationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;

    const [donations, total] = await this.donationsRepo
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.donor', 'donor')
      .where('donation.campaignId = :campaignId', { campaignId })
      .orderBy('donation.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Public donor feed only exposes what the campaign page actually shows (name + time).
    // Amount and the transfer proof screenshot stay private — the screenshot in particular
    // can contain the donor's own bank statement details.
    const data = donations.map((donation) => ({
      id: donation.id,
      anonymous: donation.anonymous,
      message: donation.message,
      createdAt: donation.createdAt,
      donor: donation.anonymous
        ? undefined
        : donation.donor && { id: donation.donor.id, name: donation.donor.name, avatarUrl: donation.donor.avatarUrl },
    }));

    return { data, total };
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
    const { donation, campaign, donor } = await this.dataSource.transaction(async (manager) => {
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

      const donor = await manager.findOne(User, { where: { id: donorId } });
      return { donation, campaign, donor };
    });

    // Best-effort notification for the campaign creator — not part of the money-moving
    // transaction above since it isn't required to be atomic with it.
    if (campaign.creatorId !== donorId) {
      const donorName = donation.anonymous ? 'Một nhà hảo tâm ẩn danh' : donor?.name ?? 'Một nhà hảo tâm';
      const notification = await this.notificationsService.create(
        campaign.creatorId,
        NotificationType.DONATION,
        `${donorName} vừa ủng hộ ${Number(dto.amount).toLocaleString('vi-VN')}đ cho chiến dịch "${campaign.title}"`,
        `/donations/${campaign.id}`,
      );
      this.messagesGateway.notifyNotification(campaign.creatorId, notification);
    }

    return donation;
  }
}
