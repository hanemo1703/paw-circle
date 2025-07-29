import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryInboxDto } from './dto/query-inbox.dto';
import { QueryConversationDto } from './dto/query-conversation.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  inbox(@Req() req: any, @Query() query: QueryInboxDto) {
    return this.messagesService.inbox(req.user.userId, query.page, query.limit);
  }

  // Declared before ':otherUserId' so it isn't swallowed by that dynamic route.
  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const count = await this.messagesService.unreadCount(req.user.userId);
    return { count };
  }

  @Post(':receiverId')
  send(@Req() req: any, @Param('receiverId') receiverId: string, @Body() dto: SendMessageDto) {
    return this.messagesService.send(req.user.userId, receiverId, dto.content);
  }

  @Get(':otherUserId')
  conversation(
    @Req() req: any,
    @Param('otherUserId') otherUserId: string,
    @Query() query: QueryConversationDto,
  ) {
    return this.messagesService.conversation(req.user.userId, otherUserId, query.before, query.limit);
  }

  @Patch(':otherUserId/read')
  markRead(@Req() req: any, @Param('otherUserId') otherUserId: string) {
    return this.messagesService.markRead(req.user.userId, otherUserId);
  }
}
