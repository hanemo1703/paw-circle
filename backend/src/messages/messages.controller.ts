import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  inbox(@Req() req: any) {
    return this.messagesService.inbox(req.user.userId);
  }

  @Post(':receiverId')
  send(@Req() req: any, @Param('receiverId') receiverId: string, @Body() dto: SendMessageDto) {
    return this.messagesService.send(req.user.userId, receiverId, dto.content);
  }

  @Get(':otherUserId')
  conversation(@Req() req: any, @Param('otherUserId') otherUserId: string) {
    return this.messagesService.conversation(req.user.userId, otherUserId);
  }

  @Patch(':otherUserId/read')
  markRead(@Req() req: any, @Param('otherUserId') otherUserId: string) {
    return this.messagesService.markRead(req.user.userId, otherUserId);
  }
}
