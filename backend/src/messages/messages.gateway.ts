import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {
    // No per-user state to clean up beyond the socket.io room membership itself.
  }

  notifyNewMessage(receiverId: string, message: unknown) {
    this.server.to(`user:${receiverId}`).emit('message:new', message);
  }

  notifyRead(userId: string, otherUserId: string) {
    this.server.to(`user:${userId}`).emit('message:read', { otherUserId });
  }

  notifyNotification(recipientId: string, notification: unknown) {
    this.server.to(`user:${recipientId}`).emit('notification:new', notification);
  }
}
