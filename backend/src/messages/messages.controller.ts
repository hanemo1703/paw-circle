import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post(':receiverId')
  send(@Req() req: any, @Param('receiverId') receiverId: string, @Body('content') content: string) {
    return this.messagesService.send(req.user.userId, receiverId, content);
  }

  @Get(':otherUserId')
  conversation(@Req() req: any, @Param('otherUserId') otherUserId: string) {
    return this.messagesService.conversation(req.user.userId, otherUserId);
  }
}
