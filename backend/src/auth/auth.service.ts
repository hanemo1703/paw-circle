import { BadRequestException, Injectable, ConflictException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { FacebookLoginDto } from './dto/facebook-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

interface FacebookDebugTokenResponse {
  data?: {
    app_id?: string;
    is_valid?: boolean;
  };
}

interface FacebookProfileResponse {
  id: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email,
      password: hashed,
      name: dto.name,
    });
    await this.usersRepo.save(user);

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (!user.password) {
      const providerLabel = user.provider === 'facebook' ? 'Facebook' : 'Google';
      throw new UnauthorizedException(
        `Tài khoản này được tạo bằng ${providerLabel}. Vui lòng đăng nhập bằng nút "Đăng nhập với ${providerLabel}".`,
      );
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return this.buildAuthResponse(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    // Only local (password-based) accounts have a password to reset — OAuth-only
    // accounts get no token, but the response stays generic either way so this
    // endpoint can't be used to enumerate which emails are registered.
    if (user && user.password) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = token;
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await this.usersRepo.save(user);

      const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;
      // No email provider is wired up yet — log the link so the flow is testable locally.
      this.logger.log(`Password reset link for ${user.email}: ${resetLink}`);
    }

    return {
      message: 'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersRepo.findOne({ where: { resetPasswordToken: dto.token } });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    // save() ignores `undefined` fields (leaves the column untouched), so clearing the
    // token needs an explicit update() with `null` instead.
    await this.usersRepo.update(user.id, {
      password: hashed,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  async googleLogin(dto: GoogleLoginDto) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new UnauthorizedException('Đăng nhập Google chưa được cấu hình trên máy chủ');
    }

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken: dto.idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token Google không hợp lệ');
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Token Google không hợp lệ');
    }

    let user = await this.usersRepo.findOne({ where: { googleId: payload.sub } });

    if (!user) {
      user = await this.usersRepo.findOne({ where: { email: payload.email } });

      if (user) {
        if (!payload.email_verified) {
          throw new UnauthorizedException('Email Google chưa được xác minh');
        }
        user.googleId = payload.sub;
        if (!user.avatarUrl && payload.picture) {
          user.avatarUrl = payload.picture;
        }
        await this.usersRepo.save(user);
      } else {
        user = this.usersRepo.create({
          email: payload.email,
          name: payload.name || payload.email,
          googleId: payload.sub,
          provider: 'google',
          avatarUrl: payload.picture,
        });
        await this.usersRepo.save(user);
      }
    }

    return this.buildAuthResponse(user);
  }

  async facebookLogin(dto: FacebookLoginDto) {
    const appId = this.configService.get<string>('FACEBOOK_APP_ID');
    const appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');
    if (!appId || !appSecret) {
      throw new UnauthorizedException('Đăng nhập Facebook chưa được cấu hình trên máy chủ');
    }

    let debugData: FacebookDebugTokenResponse['data'];
    try {
      const debugRes = await fetch(
        `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(dto.accessToken)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
      );
      const debugBody: FacebookDebugTokenResponse = await debugRes.json();
      debugData = debugBody.data;
    } catch {
      throw new UnauthorizedException('Token Facebook không hợp lệ');
    }

    if (!debugData || !debugData.is_valid || debugData.app_id !== appId) {
      throw new UnauthorizedException('Token Facebook không hợp lệ');
    }

    let profile: FacebookProfileResponse;
    try {
      const profileRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${encodeURIComponent(dto.accessToken)}`,
      );
      profile = await profileRes.json();
    } catch {
      throw new UnauthorizedException('Token Facebook không hợp lệ');
    }

    if (!profile || !profile.id) {
      throw new UnauthorizedException('Token Facebook không hợp lệ');
    }

    let user = await this.usersRepo.findOne({ where: { facebookId: profile.id } });

    if (!user && profile.email) {
      user = await this.usersRepo.findOne({ where: { email: profile.email } });

      if (user) {
        user.facebookId = profile.id;
        if (!user.avatarUrl && profile.picture?.data?.url) {
          user.avatarUrl = profile.picture.data.url;
        }
        await this.usersRepo.save(user);
      }
    }

    if (!user) {
      // Facebook accounts registered by phone number don't return an email —
      // fall back to a synthetic, non-deliverable address so the unique/NOT NULL
      // email column is still satisfied. Return visits always match via facebookId above.
      user = this.usersRepo.create({
        email: profile.email || `fb-${profile.id}@facebook.petconnect.local`,
        name: profile.name || `Người dùng Facebook ${profile.id}`,
        facebookId: profile.id,
        provider: 'facebook',
        avatarUrl: profile.picture?.data?.url,
      });
      await this.usersRepo.save(user);
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        showPhonePublicly: user.showPhonePublicly,
        showEmailPublicly: user.showEmailPublicly,
      },
    };
  }
}
